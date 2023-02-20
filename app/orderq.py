import os
from subprocess import check_output, CalledProcessError, STDOUT
import numpy as np
from python_tsp.heuristics import solve_tsp_local_search
from flask import current_app

use_ortools=os.environ.get('HEPCAT_USE_ORTOOLS')

if use_ortools:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp

# duplicates a function in upload/views.py
def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)

# duplicates a function in debug/views.py
def run_cmd(cmd):
    try:
        result = check_output(cmd, stderr=STDOUT, shell=True)
        return True, result.decode("utf-8")
    except CalledProcessError as e:
        return False, e.output.decode("utf-8")
    except Exception as err:
        out = err.output
        msg = f'Unexpected {err=}, {type(err)=}, {out}'
        return False, msg

def get_paper_conficts_set(p):
    if not p or not p.conf_users:
        return set()
    conflict_set = set(list(p.conf_users))
    return conflict_set

def get_enter_leave_conf_sets(paper_prev,paper_curr):
    conf_prev = get_paper_conficts_set(paper_prev)
    conf_curr = get_paper_conficts_set(paper_curr)
    enter = conf_prev - conf_curr
    leave = conf_curr - conf_prev
    return conf_prev,conf_curr,enter,leave

def get_user_cost(user):
    if user.is_admin:
        # print('big cost for admin user with name ', user.full_name)
        return 100
    return 1

def get_enter_leave_cost(users):
    # old version counted admin more
    # costs = [get_user_cost(user) for user in users]
    # total = sum(costs)
    total = len(users)
    return total

def get_paper_distance(paper_prev,paper_curr,verbose=False):
    conf_prev,conf_curr,enter,leave = get_enter_leave_conf_sets(paper_prev,paper_curr)
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
    distance_matrix = np.zeros((n,n))
    for i in range(n-1):
        pi = papers[i]
        for j in range(i+1,n):
            pj = papers[j]
            d = get_paper_distance(pi,pj)
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
    hops = len(ordered_papers)-1
    for i in range(hops):
        pi = ordered_papers[i]
        pj = ordered_papers[i+1]
        get_paper_distance(pi,pj,True)

########### CONCORDE ############

def write_concorde_input(matrix, fname):
    dim = str(len(matrix))
    f = open(fname, "w")
    f.write("""
NAME: papers
TYPE: TSP
COMMENT: PC Meeting Conflicts
DIMENSION: """ + dim + """
EDGE_WEIGHT_TYPE: EXPLICIT
EDGE_WEIGHT_FORMAT: FULL_MATRIX
EDGE_WEIGHT_SECTION
""")
    for row in matrix:
        strings = [str(d) for d in row]
        line = " ".join(strings) + "\n"
        f.write(line)
    f.write("EOF")
    f.close()

def call_concorde(concorde_path, concorde_input, concorde_output):
    # flags passed to concorde:
    # -s 0 : seed random number generator to 0 so answer is deterministic
    # -x   : delete files on completion (sav pul mas)
    # -V   : just run fast cuts
    # -o f : output solution to file f
    cmd = f'{concorde_path} -s 0 -x -V -o {concorde_output} {concorde_input}'
    print(cmd)
    run_cmd(cmd)
    
def read_solution(solution_file):
    f = open(solution_file, "r")
    lines = f.readlines()
    f.close()
    del lines[0] # first row just contains number of nodes
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
    concorde_input = 'concorde_input.txt'
    concorde_output = 'concorde_output.txt'
    concorde_input_path = os.path.join(working_folder, concorde_input)
    concorde_output_path = os.path.join(working_folder, concorde_output)
    concorde_path = os.path.join(bin_folder, 'concorde')
    write_concorde_input(distance_matrix, concorde_input_path)
    call_concorde(concorde_path, concorde_input_path, concorde_output_path)
    node_order = read_solution(concorde_output_path)
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
    print(f'splitting tour at location {maxindex} (leftshift {leftshift}) with max cost {cost}')
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
    print(f'splitting tour at location {high_index} (leftshift {leftshift}) with high cost {cost}')
    nodes = rotate_list_left(nodes, leftshift)
    trans_costs = rotate_list_left(trans_costs, leftshift)
    return nodes, trans_costs

def split_tour_at_min_pair_node_cost(nodes, node_costs):
    pair_costs = []
    n = len(nodes)
    for i in range(n):
        j = (i+1) % n
        pair = node_costs[i] + node_costs[j]
        pair_costs.append(pair)
    min_i = np.argmin(pair_costs)
    leftshift = min_i + 1
    cost = pair_costs[min_i]
    print(f'splitting tour at location {min_i} (leftshift {leftshift}) with low pair cost {cost}')
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
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']),
                                           data['num_vehicles'], data['depot'])
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
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    solution = routing.SolveWithParameters(search_parameters)
    if solution:
        nodes,_ = get_tsp_solution(manager, routing, solution)
        return nodes
    return None

######## END ORTOOLS #########

def tsp_transition_costs(nodes, distance_matrix):
    n = len(nodes)
    costs = []
    for i in range(n):
        j = (i+1) % n
        nodei = nodes[i]
        nodej = nodes[j]
        cost = distance_matrix[nodei][nodej]
        costs.append(cost)
    return costs

def order_q_select_alg(papers, distance_matrix):
    nodes = setup_and_run_concorde(distance_matrix)
    # if use_ortools: # global set at top of file
    #     print('solving tsp using ortools')
    #     nodes = solve_tsp_ortools(distance_matrix)
    # else:
    #     print('solving tsp using local search')
    #     nodes, _ = solve_tsp_local_search(distance_matrix, max_processing_time=2.0)
    # if not nodes:
    #     return None, 0
    nodes, distance = improve_tour(papers, distance_matrix, nodes)
    return nodes, distance

def order_q(papers, verbose=False):
    n = len(papers)
    maxn = 100
    remainder = None
    if n < 3:
        print(f'skip ordering {n} papers because it is too few.')
        return papers
    if n > maxn:
        n = maxn
        remainder = papers[maxn:] # slice off the ones after max
        papers = papers[:maxn] # only optimize these first ones
    distance_matrix = get_distance_matrix(papers)
    permutation, distance = order_q_select_alg(papers,distance_matrix)
    if permutation:
        ordered_papers = permute_papers(papers, permutation)
    else:
        ordered_papers = papers
    if verbose:
        debug_order(distance_matrix, permutation, distance, ordered_papers)
    print(f'ordered {n} papers with total cost {distance}')
    if remainder:
        print('(The other papers were not ordered and just appended.)')
        ordered_papers += remainder
    return ordered_papers
