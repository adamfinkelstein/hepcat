import os
import time
import random

# from subprocess import check_output, CalledProcessError, STDOUT
from subprocess import run
import numpy as np

# from python_tsp.heuristics import solve_tsp_local_search
from flask import current_app

use_ortools = os.environ.get('HEPCAT_USE_ORTOOLS')

if use_ortools:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp


# duplicates a function in upload/views.py
def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)


# old, unused:
# def run_cmd_check_output(cmd):
#     # note shell=True allows cmd as single string
#     try:
#         result = check_output(cmd, stderr=STDOUT, shell=True)
#         return True, result.decode("utf-8")
#     except CalledProcessError as e:
#         return False, e.output.decode("utf-8")
#     except Exception as err:
#         out = err.output
#         msg = f'Unexpected {err=}, {type(err)=}, {out}'
#         return False, msg


# https://docs.python.org/3/library/subprocess.html#subprocess.run
# for unknown reasons, concorde returns code 255 (error) even when successful.
def run_cmd(cmd, ignore_errors=False):
    words = cmd.split()
    result = run(words, capture_output=True)
    if result.returncode and not ignore_errors:
        return False, f'run command error: {result}'
    return True, ''


def get_paper_conficts_set(p):
    if not p or not p.conf_users:
        return set()
    conflict_set = set(list(p.conf_users))
    return conflict_set


def get_enter_leave_conf_sets(paper_prev, paper_curr):
    conf_prev = get_paper_conficts_set(paper_prev)
    conf_curr = get_paper_conficts_set(paper_curr)
    enter = conf_prev - conf_curr
    leave = conf_curr - conf_prev
    return conf_prev, conf_curr, enter, leave


def get_user_cost(user):
    if user.role_is_admin:
        # print('big cost for admin user with name ', user.full_name)
        return 100
    return 1


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
        print('stay out: ', stay)
        print('enter: ', enter)
        print('leave: ', leave)
        print('total: ', total)
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
    costs = [get_enter_leave_cost(get_paper_conficts_set(papers[n])) for n in nodes]
    return costs


def permute_papers(papers, permutation):
    result = []
    for i in permutation:
        result.append(papers[i])
    return result


def debug_order(distance_matrix, permutation, distance, ordered_papers):
    print('distances:\n', distance_matrix)
    print('solution:', permutation, distance)
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
        # print(f'cost from {nodei} to {nodej} is {d} (total {cost})')
    return cost


########### CONCORDE ############


def write_string_to_file(contents, fname):
    with open(fname, 'w') as f:
        f.write(contents)


def write_concorde_input(matrix, fname):
    dim = len(matrix)
    # For format, see Example 2 here:
    # https://www.math.uwaterloo.ca/tsp/iphone/help.html
    contents = f'''NAME: papers
TYPE: TSP
COMMENT: PC Meeting Conflicts
DIMENSION: {dim}
EDGE_WEIGHT_TYPE: EXPLICIT
EDGE_WEIGHT_FORMAT: LOWER_DIAG_ROW
EDGE_WEIGHT_SECTION
'''
    for i in range(dim):
        row = matrix[i]
        row = row[: i + 1]  # only up to diag
        row = [str(int(round(v))) for v in row]
        row = ' '.join(row) + '\n'
        contents += row
    contents += 'EOF\n'
    write_string_to_file(contents, fname)


def call_concorde(concorde_path, concorde_input):
    # flags passed to concorde:
    # -s 0 : seed random number generator to 0 so answer is deterministic
    # -x   : delete files on completion (sav pul mas)
    # -V   : just run fast cuts
    # -o f : output solution to file f
    cmd = f'{concorde_path} -s 0 -x -V {concorde_input}'
    # print(cmd)
    return run_cmd(cmd, True)


def read_solution(solution_file):
    f = open(solution_file, "r")
    lines = f.readlines()
    f.close()
    del lines[0]  # first row just contains number of nodes
    order = []
    for line in lines:
        parts = line.split()
        indices = [int(i) for i in parts]
        order.extend(indices)
    return order


def setup_and_run_concorde(distance_matrix):
    app = current_app._get_current_object()
    working_folder = app.config['UPLOAD_FOLDER']
    bin_folder = app.config['BIN_FOLDER']
    make_path_if_needed(working_folder)
    concorde_input = 'concorde_data.txt'
    concorde_output = 'concorde_data.sol'
    concorde_path = os.path.join(bin_folder, 'concorde')
    current_directory = os.getcwd()  # remember where we were
    os.chdir(working_folder)
    write_concorde_input(distance_matrix, concorde_input)
    ok, output = call_concorde(concorde_path, concorde_input)
    if ok:
        print(f'concorde claimed ok -- output:\n{output}')
    else:
        print(f'concorde claimed error -- output:\n{output}')
    node_order = read_solution(concorde_output)
    os.chdir(current_directory)  # return to where we were
    return node_order


########### ORTOOLS ############


def pack_data(distance_matrix):
    data = {}
    data['distance_matrix'] = distance_matrix.tolist()
    data['num_vehicles'] = 1
    data['depot'] = 0
    return data


# mylist = [1, 3, 5, 7, 9]
# rotate_list_left(mylist, 2)  # rotate left:  [5, 7, 9, 1, 3]
# rotate_list_left(mylist, -2) # rotate right: [7, 9, 1, 3, 5]
def rotate_list_left(arr, shift):
    return arr[shift:] + arr[:shift]


def split_tour_at_max_cost(nodes, trans_costs):
    maxindex = np.argmax(trans_costs)
    leftshift = maxindex + 1
    cost = trans_costs[maxindex]
    print(
        f'splitting tour at location {maxindex} (leftshift {leftshift}) with max cost {cost}'
    )
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
    print(
        f'splitting tour at location {high_index} (leftshift {leftshift}) with high cost {cost}'
    )
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
    print(
        f'splitting tour at location {min_i} (leftshift {leftshift}) with low pair cost {cost}'
    )
    nodes = rotate_list_left(nodes, leftshift)
    node_costs = rotate_list_left(node_costs, leftshift)
    return nodes, node_costs


# Two potential improvements to a circular tour:
# 1. Since we do not return to the starting paper, split at the most expensive transition.
# 2. Once split, we can tour in either order, so possibly reverse to put most conflicts at end
# later add second opt here
def improve_tour(papers, distance_matrix, nodes):
    trans_costs = tsp_transition_costs(nodes, distance_matrix)
    node_costs = get_node_costs(papers, nodes)
    print('after split... trans_costs and node_costs:')
    print(trans_costs)
    print(node_costs)
    # nodes, trans_costs = split_tour_at_last_high_cost(nodes, trans_costs)
    # nodes, trans_costs = split_tour_at_max_cost(nodes, trans_costs)
    nodes, node_costs = split_tour_at_min_pair_node_cost(nodes, node_costs)
    print('after split... trans_costs and node_costs:')
    print(trans_costs)
    print(node_costs)
    costs_minus_last = trans_costs[:-1]
    distance = sum(costs_minus_last)
    return nodes, distance


def get_tsp_solution(manager, routing, solution):
    nodes = []
    costs = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        previous_index = index
        index = solution.Value(routing.NextVar(index))
        cost = routing.GetArcCostForVehicle(previous_index, index, 0)
        nodes.append(node)
        costs.append(cost)
    return nodes, costs


def solve_tsp_ortools(distance_matrix):
    data = pack_data(distance_matrix)
    manager = pywrapcp.RoutingIndexManager(
        len(data['distance_matrix']), data['num_vehicles'], data['depot']
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        """Returns the distance between the two nodes."""
        # Convert from routing variable Index to distance matrix NodeIndex.
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    solution = routing.SolveWithParameters(search_parameters)
    if solution:
        nodes, _ = get_tsp_solution(manager, routing, solution)
        return nodes
    return None


######## END ORTOOLS #########


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
    print(f'cost of linear path: {cost}')

    if use_ortools:  # global set at top of file
        start_timer()
        nodes = solve_tsp_ortools(distance_matrix)
        diff = elapsed_time()
        cost = tour_cost(distance_matrix, nodes)
        print(f'cost of ortools path: {cost} (time {diff})')
    else:
        start_timer()
        nodes = setup_and_run_concorde(distance_matrix)
        diff = elapsed_time()
        cost = tour_cost(distance_matrix, nodes)
        print(f'cost of concorde path: {cost} (time {diff})')
    if not nodes:
        return None, 0
    # nodes, distance = improve_tour(papers, distance_matrix, nodes)
    return nodes


class Minipaper:
    def __init__(self, nid, conf_users):
        self.nid = nid
        self.conf_users = conf_users


def paper_conflicts_culled(p, letter):
    conflicts_culled = []
    for user in p.conf_users:
        if user.rooms and letter in user.rooms:
            conflicts_culled.append(user)
    # paper_copy = {'nid': p.nid, 'conf_users':conflicts_culled}
    paper_copy = Minipaper(p.nid, conflicts_culled)
    return paper_copy


def papers_with_only_conflicts_in_room(papers, room):
    if not room or room == 'Plenary':
        return papers
    letter = room[-1]  # last character
    print(f'culling paper conflicts for room {letter}...')
    result = [paper_conflicts_culled(p, letter) for p in papers]
    return result


def order_q(papers, room, verbose=False):
    n = len(papers)
    maxn = 60
    over_max = False
    # remainder = None
    if n < 3:
        print(f'skip ordering {n} papers because it is too few.')
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
    print(f'ordered {n} papers')  # with total cost {distance}')
    # if remainder:
    #     print('(The other papers were not ordered and just appended.)')
    #     ordered_papers += remainder
    return ordered_papers, over_max
