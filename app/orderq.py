import os
import numpy as np
from python_tsp.heuristics import solve_tsp_local_search

use_ortools=os.environ.get('HEPCAT_USE_ORTOOLS')

if use_ortools:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp

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

def get_paper_distance(paper_prev,paper_curr,verbose=False):
    conf_prev,conf_curr,enter,leave = get_enter_leave_conf_sets(paper_prev,paper_curr)
    sum = len(enter) + len(leave)
    if verbose:
        stay = conf_curr.intersection(conf_prev)
        print('stay out: ', stay)
        print('enter: ', enter)
        print('leave: ', leave)
        print('sum: ', sum)
    return sum

def get_distance_matrix(papers):
    n = len(papers)
    distance_matrix = np.zeros((n,n))
    verbose = False
    for i in range(n-1):
        pi = papers[i]
        for j in range(i+1,n):
            pj = papers[j]
            d = get_paper_distance(pi,pj,verbose)
            distance_matrix[i][j] = d
            distance_matrix[j][i] = d
    return distance_matrix

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

def split_tour_at_max_cost(nodes, costs):
    maxindex = np.argmax(costs)
    leftshift = maxindex + 1
    cost = costs[maxindex]
    print(f'splitting tour at location {maxindex} (leftshift {leftshift}) with max cost {cost}')
    nodes = rotate_list_left(nodes, leftshift)
    costs = rotate_list_left(costs, leftshift)
    return nodes, costs

# Two potential improvements to a circular tour:
# 1. Since we do not return to the starting paper, split at the most expensive transition.
# 2. Once split, we can tour in either order, so possibly reverse to put more conflicts at end
def improve_tour(nodes, costs):
    nodes, costs = split_tour_at_max_cost(nodes, costs)
    # later add second opt here
    return nodes, costs

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

def solve_tsp(distance_matrix):
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
        nodes, costs = get_tsp_solution(manager, routing, solution)
        nodes, costs = improve_tour(nodes, costs)
        return nodes, costs
    return None, None

def order_q_ortools(distance_matrix):
    nodes, costs = solve_tsp(distance_matrix)
    if not nodes:
        return None, 0
    costs_minus_last = costs[:-1]
    distance = sum(costs_minus_last)
    return nodes, distance

######## END #########

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
    if use_ortools:
        print('solving tsp using ortools')
        permutation, distance = order_q_ortools(distance_matrix)
    else:
        print('solving tsp using local search')
        permutation, distance = solve_tsp_local_search(distance_matrix, max_processing_time=2.0)
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
