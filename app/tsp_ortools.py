import numpy as np
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


# Next 2 funcs duplicated from util to make this app standalone


def write_text_to_file(text, filename):
    with open(filename, "w") as f:
        f.write(text)


def read_lines_from_file(filename):
    with open(filename, "r") as f:
        return f.readlines()


# Example input file:
"""
NAME: papers
TYPE: TSP
COMMENT: PC Meeting Conflicts
DIMENSION: 6
EDGE_WEIGHT_TYPE: EXPLICIT
EDGE_WEIGHT_FORMAT: LOWER_DIAG_ROW
EDGE_WEIGHT_SECTION
0
3 0
7 6 0
3 4 4 0
4 5 7 3 0
3 4 4 6 7 0
EOF
"""


# Read matrix in the format shown above (TSPLIB format).
def read_distance_matrix(fname):
    lines = read_lines_from_file(fname)
    dim_line = lines[3]
    print(dim_line)
    parts = dim_line.split()
    n = int(parts[1])
    print("n =", n)
    distance_matrix = np.zeros((n, n))
    lines = lines[7:-1]  # just retain lower triangle data
    for row in range(n):
        line = lines[row]
        parts = line.split()
        parts = [int(p) for p in parts]
        print(parts)
        for col in range(row):  # up to just before diag
            dist = parts[col]
            distance_matrix[row][col] = dist
            distance_matrix[col][row] = dist
    print(distance_matrix)
    return distance_matrix


# Example output file.
# Concorde writes newlines after every 10 nodes, but not needed here.
"""
6
0 4 3 2 5 1
"""


def write_solution(nodes, fname):
    n = len(nodes)
    nodes = [str(n) for n in nodes]
    nodes = " ".join(nodes)
    content = f"{n}\n{nodes}\n"
    write_text_to_file(content, fname)


########## ORTOOLS ##########


def ortools_pack_data(distance_matrix):
    data = {}
    data["distance_matrix"] = distance_matrix.tolist()
    data["num_vehicles"] = 1
    data["depot"] = 0
    return data


def ortools_get_tsp_solution(manager, routing, solution):
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


def solve_tsp_with_ortools(distance_matrix):
    data = ortools_pack_data(distance_matrix)
    manager = pywrapcp.RoutingIndexManager(
        len(data["distance_matrix"]), data["num_vehicles"], data["depot"]
    )
    routing = pywrapcp.RoutingModel(manager)

    def ortools_distance_callback(from_index, to_index):
        """Returns the distance between the two nodes."""
        # Convert from routing variable Index to distance matrix NodeIndex.
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data["distance_matrix"][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(ortools_distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    solution = routing.SolveWithParameters(search_parameters)
    if solution:
        nodes, _ = ortools_get_tsp_solution(manager, routing, solution)
        return nodes
    return None


########## MAIN ##########


def main():
    infile = "tsp_matrix.txt"
    outfile = "tsp_matrix.sol"
    matrix = read_distance_matrix(infile)
    nodes = solve_tsp_with_ortools(matrix)
    if nodes:
        write_solution(nodes, outfile)
    else:
        print("TSP solver (ortools) failed.")


if __name__ == "__main__":
    main()
