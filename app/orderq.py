from math import dist
import numpy as np
from python_tsp.heuristics import solve_tsp_local_search
from python_tsp.exact import solve_tsp_dynamic_programming
# from .models import Paper

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
    conflicts = p.conf_users
    ids = list(map(lambda c: c.id, conflicts))
    ids = set(ids)
    return ids

def get_paper_distance(pi,pj,verbose=False):
    confi = get_paper_conficts_set(pi)
    confj = get_paper_conficts_set(pj)
    enter = confi - confj
    leave = confj - confi
    sum = len(enter) + len(leave)
    if verbose:
        stay = confi.intersection(confj)
        print('stay: ', stay)
        print('enter: ', enter)
        print('leave: ', leave)
        print('sum: ', sum)
    return sum

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
    if n > maxn:
        print(f'skip ordering {n} papers because it is too slow for more than {maxn}.')
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
