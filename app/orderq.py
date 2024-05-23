import os
import platform
import time
import random
import numpy as np
from flask import current_app
from .util import run_cmd, make_path_if_needed, write_text_to_file, read_lines_from_file
from . import log_print


def get_paper_conflicts_set(p):
    if not p or not p.conf_users:
        return set()
    conflict_set = set(list(p.conf_users))
    return conflict_set


def get_enter_leave_conf_sets(paper_prev, paper_curr):
    conf_prev = get_paper_conflicts_set(paper_prev)
    conf_curr = get_paper_conflicts_set(paper_curr)
    enter = conf_prev - conf_curr
    leave = conf_curr - conf_prev
    return conf_prev, conf_curr, enter, leave


# old version counted admin more
# def get_user_cost(user):
#     if user.role_is_admin:
#         # log_print('big cost for admin user with name ', user.full_name)
#         return 100
#     return 1


def get_enter_leave_cost(users):
    # old version counted admin more
    # costs = [get_user_cost(user) for user in users]
    # total = sum(costs)
    total = len(users)
    return total


def get_paper_distance(paper_prev, paper_curr, verbose=False):
    conf_prev, conf_curr, enter, leave = get_enter_leave_conf_sets(
        paper_prev, paper_curr
    )
    total = get_enter_leave_cost(enter) + get_enter_leave_cost(leave)
    if verbose:
        stay = conf_curr.intersection(conf_prev)
        log_print(f"stay out: {stay}")
        log_print(f"enter: {enter}")
        log_print(f"leave: {leave}")
        log_print(f"total: {total}")
    return total


def get_distance_matrix(papers):
    n = len(papers)
    distance_matrix = np.zeros((n, n))
    for i in range(n - 1):
        pi = papers[i]
        for j in range(i + 1, n):
            pj = papers[j]
            d = get_paper_distance(pi, pj)
            distance_matrix[i][j] = d
            distance_matrix[j][i] = d
    return distance_matrix


def get_node_costs(papers, nodes):
    costs = [get_enter_leave_cost(get_paper_conflicts_set(papers[n])) for n in nodes]
    return costs


def permute_papers(papers, permutation):
    result = []
    for i in permutation:
        result.append(papers[i])
    return result


def debug_order(distance_matrix, permutation, distance, ordered_papers):
    log_print(f"distances:\n{distance_matrix}")
    log_print(f"solution: {permutation}\n{distance}")
    hops = len(ordered_papers) - 1
    for i in range(hops):
        pi = ordered_papers[i]
        pj = ordered_papers[i + 1]
        get_paper_distance(pi, pj, True)  # why not use distance_matrix???


def tour_cost(distance_matrix, permutation):
    if not permutation:
        return 0
    n = len(permutation)
    cost = 0
    for i in range(n):
        j = (i + 1) % n
        nodei = permutation[i]
        nodej = permutation[j]
        d = distance_matrix[nodei][nodej]
        cost += d
        # log_print(f'cost from {nodei} to {nodej} is {d} (total {cost})')
    return cost


###########
#
# IMPROVE TOUR (CURRENTLY UNUSED)
#
###########


# mylist = [1, 3, 5, 7, 9]
# rotate_list_left(mylist, 2)  # rotate left:  [5, 7, 9, 1, 3]
# rotate_list_left(mylist, -2) # rotate right: [7, 9, 1, 3, 5]
def rotate_list_left(arr, shift):
    return arr[shift:] + arr[:shift]


def split_tour_at_max_cost(nodes, trans_costs):
    maxindex = np.argmax(trans_costs)
    leftshift = maxindex + 1
    cost = trans_costs[maxindex]
    msg = f"splitting tour at location {maxindex}"
    msg += f" (leftshift {leftshift}) with max cost {cost}"
    log_print(msg)
    nodes = rotate_list_left(nodes, leftshift)
    trans_costs = rotate_list_left(trans_costs, leftshift)
    return nodes, trans_costs


def split_tour_at_last_high_cost(nodes, trans_costs):
    high_index = -1
    n = len(nodes)
    for i in range(n):
        if trans_costs[i] >= 100:
            high_index = i
    if high_index < 0:
        return nodes, trans_costs
    cost = trans_costs[high_index]
    leftshift = high_index + 1
    msg = f"splitting tour at location {high_index}"
    msg += f" (leftshift {leftshift}) with high cost {cost}"
    log_print(msg)
    nodes = rotate_list_left(nodes, leftshift)
    trans_costs = rotate_list_left(trans_costs, leftshift)
    return nodes, trans_costs


def split_tour_at_min_pair_node_cost(nodes, node_costs):
    pair_costs = []
    n = len(nodes)
    for i in range(n):
        j = (i + 1) % n
        pair = node_costs[i] + node_costs[j]
        pair_costs.append(pair)
    min_i = np.argmin(pair_costs)
    leftshift = min_i + 1
    cost = pair_costs[min_i]
    msg = f"splitting tour at location {min_i}"
    msg += f" (leftshift {leftshift}) with low pair cost {cost}"
    log_print(msg)
    nodes = rotate_list_left(nodes, leftshift)
    node_costs = rotate_list_left(node_costs, leftshift)
    return nodes, node_costs


# Two potential improvements to a circular tour:
# 1. Since we do not return to the starting paper,
#    split at the most expensive transition.
# 2. Once split, we can tour in either order,
#    so possibly reverse to put most conflicts at end.
# (later add second opt here)
def improve_tour(papers, distance_matrix, nodes):
    trans_costs = tsp_transition_costs(nodes, distance_matrix)
    node_costs = get_node_costs(papers, nodes)
    log_print("after split... trans_costs and node_costs:")
    log_print(trans_costs)
    log_print(node_costs)
    # nodes, trans_costs = split_tour_at_last_high_cost(nodes, trans_costs)
    # nodes, trans_costs = split_tour_at_max_cost(nodes, trans_costs)
    nodes, node_costs = split_tour_at_min_pair_node_cost(nodes, node_costs)
    log_print("after split... trans_costs and node_costs:")
    log_print(trans_costs)
    log_print(node_costs)
    costs_minus_last = trans_costs[:-1]
    distance = sum(costs_minus_last)
    return nodes, distance


###########
#
# RUN EXTERNAL TSP
#
###########


def write_tsp_input(matrix, fname):
    dim = len(matrix)
    # For format, see Example 2 here:
    # https://www.math.uwaterloo.ca/tsp/iphone/help.html
    contents = f"""NAME: papers
TYPE: TSP
COMMENT: PC Meeting Conflicts
DIMENSION: {dim}
EDGE_WEIGHT_TYPE: EXPLICIT
EDGE_WEIGHT_FORMAT: LOWER_DIAG_ROW
EDGE_WEIGHT_SECTION
"""
    for i in range(dim):
        row = matrix[i]
        row = row[: i + 1]  # only up to diag
        row = [str(int(round(v))) for v in row]
        row = " ".join(row) + "\n"
        contents += row
    contents += "EOF\n"
    write_text_to_file(contents, fname)


def get_concorde_path_if_exists(bin_folder):
    local_platform = platform.system() + "." + platform.machine()
    log_print(f"local_platform: {local_platform}")
    executable = "concorde." + local_platform
    concorde_path = os.path.join(bin_folder, executable)
    if os.path.isfile(concorde_path):
        return concorde_path
    return None


def run_concorde(concorde_path, input_file):
    # flags passed to concorde:
    # -s 0 : seed random number generator to 0 so answer is deterministic
    # -x   : delete files on completion (sav pul mas)
    # -V   : just run fast cuts
    # -o f : output solution to file f
    cmd = f"{concorde_path} -s 0 -x -V {input_file}"
    run_cmd(cmd, True)
    # log_print(cmd)
    # ok, output = run_cmd(cmd, True)
    # if ok:
    #     log_print(f"concorde claimed ok -- output:\n{output}")
    # else:
    #     log_print(f"concorde claimed error -- output:\n{output}")


def run_ortools(app_folder, input_file):
    script_path = os.path.join(app_folder, "tsp_ortools.py")
    cmd = f"python {script_path} {input_file}"
    # log_print(cmd)
    ok, output = run_cmd(cmd, False)
    if ok:
        log_print("tsp_ortools claimed ok")
    else:
        log_print(f"tsp_ortools claimed error -- output:\n{output}")


def read_solution(solution_file):
    lines = read_lines_from_file(solution_file)
    del lines[0]  # first row just contains number of nodes
    order = []
    for line in lines:
        parts = line.split()
        indices = [int(i) for i in parts]
        order.extend(indices)
    return order


def setup_and_run_tsp_opt(distance_matrix):
    app = current_app._get_current_object()
    working_folder = app.config["UPLOAD_FOLDER"]
    bin_folder = app.config["BIN_FOLDER"]
    app_folder = app.config["APP_FOLDER"]
    make_path_if_needed(working_folder)
    input_file = "tsp_matrix.txt"
    output_file = "tsp_matrix.sol"
    current_directory = os.getcwd()  # remember where we were
    os.chdir(working_folder)
    write_tsp_input(distance_matrix, input_file)
    use_ortools = os.environ.get("HEPCAT_USE_ORTOOLS")
    concorde_path = get_concorde_path_if_exists(bin_folder)
    if use_ortools or not concorde_path:  # global set at top of file
        solver = "ortools"
        run_ortools(app_folder, input_file)
    else:
        solver = "concorde"
        run_concorde(concorde_path, input_file)
    node_order = read_solution(output_file)
    os.chdir(current_directory)  # return to where we were
    return node_order, solver


###########
#
# ORDER QUEUE
#
# #########


def tsp_transition_costs(nodes, distance_matrix):
    n = len(nodes)
    costs = []
    for i in range(n):
        j = (i + 1) % n
        nodei = nodes[i]
        nodej = nodes[j]
        cost = distance_matrix[nodei][nodej]
        costs.append(cost)
    return costs


START_TIME = None


def start_timer():
    global START_TIME
    START_TIME = time.time()


def elapsed_time():
    global START_TIME
    end = time.time()
    diff = end - START_TIME
    diff = round(diff, 3)
    return diff


def order_q_select_alg(distance_matrix):
    nodes = list(range(len(distance_matrix[0])))
    cost = tour_cost(distance_matrix, nodes)
    log_print(f"cost of linear path: {cost}")
    start_timer()
    nodes, solver = setup_and_run_tsp_opt(distance_matrix)
    diff = elapsed_time()
    cost = tour_cost(distance_matrix, nodes)
    log_print(f"cost of {solver} path: {cost} (time {diff})")
    if not nodes:
        return None, 0
    # nodes, distance = improve_tour(papers, distance_matrix, nodes)
    return nodes


###########
#
# Minipaper Class contains a temp copy of the paper only including
# conflicts that are the current room. This allows optimization
# only over conflicts in this room.
#
###########


class Minipaper:
    def __init__(self, nid, conf_users):
        self.nid = nid
        self.conf_users = conf_users


def paper_conflicts_culled(p, room_code):
    conflicts_culled = []
    for user in p.conf_users:
        if user.rooms and room_code in user.rooms:
            conflicts_culled.append(user)
    # paper_copy = {'nid': p.nid, 'conf_users':conflicts_culled}
    paper_copy = Minipaper(p.nid, conflicts_culled)
    return paper_copy


def papers_with_only_conflicts_in_room(papers, room):
    if not room or room == "Plenary":
        return papers
    room_code = room[-2:]  # last 2 char, like 1A for Room_1A
    log_print(f"culling paper conflicts for room {room_code}...")
    result = [paper_conflicts_culled(p, room_code) for p in papers]
    return result


def order_q(papers, room, verbose=False):
    n = len(papers)
    maxn = 60
    over_max = False
    # remainder = None
    if n < 3:
        log_print(f"skip ordering {n} papers because it is too few.")
        return papers, over_max
    if n > maxn:
        n = maxn
        # remainder = papers[maxn:] # slice off the ones after max
        random.shuffle(papers)  # choose random subset
        papers = papers[:maxn]  # only optimize these first ones
        over_max = maxn
    papers_copy = papers_with_only_conflicts_in_room(papers, room)
    distance_matrix = get_distance_matrix(papers_copy)
    permutation = order_q_select_alg(distance_matrix)
    if permutation:
        ordered_papers = permute_papers(papers, permutation)
    else:
        ordered_papers = papers
    if verbose:
        debug_order(distance_matrix, permutation, 0, ordered_papers)
    log_print(f"ordered {n} papers")  # with total cost {distance}')
    # if remainder:
    #     log_print('(The other papers were not ordered and just appended.)')
    #     ordered_papers += remainder
    return ordered_papers, over_max
