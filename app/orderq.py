from math import dist
import numpy as np
from python_tsp.heuristics import solve_tsp_local_search
from python_tsp.exact import solve_tsp_dynamic_programming

# for exact solution (only for small matrices)...
# from python_tsp.exact import solve_tsp_dynamic_programming
# distance_matrix = np.array([
#     [0,  5, 4, 10],
#     [5,  0, 8,  5],
#     [4,  8, 0,  3],
#     [10, 5, 3,  0]
# ])
# permutation, distance = solve_tsp_dynamic_programming(distance_matrix)

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
    verbose = (n<12)
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

def order_q(papers, optimal=False, verbose=False):
    maxn = 100
    n = len(papers)
    if n < 3 or n > maxn:
        print(f'skip ordering {n} papers because it is too few, or too many/slow (max={maxn}).')
        return papers
    distance_matrix = get_distance_matrix(papers)
    if optimal:
        permutation, distance = solve_tsp_dynamic_programming(distance_matrix)
    else:
        permutation, distance = solve_tsp_local_search(distance_matrix, max_processing_time=2.0)
    ordered_papers = permute_papers(papers, permutation)
    if verbose:
        debug_order(distance_matrix, permutation, distance, ordered_papers)
    print(f'ordered {n} papers with total cost {distance}')
    return ordered_papers
