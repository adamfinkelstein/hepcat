from lark import Lark, Transformer
from lark.exceptions import LarkError


def get_set_op_grammar():
    return """
%import common.WS
%ignore WS
start: one_expr
one_expr: leaf_expr | and_expr | or_expr | not_expr -> one_expr
leaf_expr: LEAF -> leaf_expr
and_expr: "AND" "(" one_expr ("," one_expr)* ")" -> and_expr
or_expr:  "OR"  "(" one_expr ("," one_expr)* ")" -> or_expr
not_expr: "NOT" "(" one_expr ")" -> not_expr
LEAF: /[A-Za-z][A-Za-z0-9:_.-]*/
"""


class SetOpTransformer(Transformer):
    def __init__(self, set_universe, set_filter, extra_arg=None):
        self.set_universe = set_universe  # set containing all items
        self.set_filter = set_filter  # function to filter a set by string
        self.extra_arg = extra_arg  # extra arg used now for room

    def one_expr(self, args):
        return args[0]

    def leaf_expr(self, args):
        filter = args[0].value
        extra_arg = self.extra_arg
        if extra_arg is None:
            result = self.set_filter(filter)
        else:
            result = self.set_filter(filter, extra_arg)
        return result

    def and_expr(self, args):
        result = args[0]
        other_args = args[1:]
        for arg in other_args:
            result = result & arg
        return result

    def or_expr(self, args):
        result = args[0]
        other_args = args[1:]
        for arg in other_args:
            result = result | arg
        return result

    def not_expr(self, args):
        result = self.set_universe - args[0]
        return result


##############################
#
#     EXPORTED INTERFACE
#
##############################


# extra_arg is used to pass the room if applicable.
#   probably should be a dict, allowing for multiple args.
def set_op_make_parser(set_universe, set_filter, extra_arg=None):
    x_form = SetOpTransformer(set_universe, set_filter, extra_arg)
    grammar = get_set_op_grammar()
    parser = Lark(grammar, parser="lalr", transformer=x_form)
    return parser


def set_op_parse_expr(parser, expr):
    try:
        parsed = parser.parse(expr)
        root = parsed.children[0]
        return root
    except LarkError:
        return None


##############################
#
#     TESTING BELOW HERE
#
##############################

test_universe = set(list(range(10)))
test_group012 = set([0, 1, 2])
test_group234 = set([2, 3, 4])
test_group456 = set([4, 5, 6])

test_all_sets = {
    "Group012": test_group012,
    "Group_234": test_group234,
    "Group-456": test_group456,
}


def test_get_set_by_name(name):
    if name in test_all_sets:
        return test_all_sets[name]
    return None


def test_exprs_get():
    return """
AND (Group012, Group_234, OR(Group012,  Group_234), NOT( Group-456)) | 2
AND(Group012,NOT(Group_234)) | 0, 1
AND(Group012) | 0, 1, 2
OR(Group012) | 0, 1, 2
NOT(Group012) | 3, 4, 5, 6, 7, 8, 9
Group012 | 0, 1, 2
GroupNone | Fail
FOO() | Fail
NOT(Group012| Fail
"""


def test_remove_empty_strings(tests):
    tests = [test.strip() for test in tests]  # remove trailing whitespace
    tests = [test for test in tests if test]  # remove empty lines
    return tests


def test_sets_equal(set1, set2):
    diff1 = set1 - set2
    diff2 = set2 - set1
    if len(diff1) + len(diff2) == 0:
        return True
    return False


def test_compare_results(result, expect):
    if result is None and expect is None:
        return True
    if result is None or expect is None:
        return False
    return test_sets_equal(result, expect)


def test_report_results(expr, result, expect, verbose=False):
    ok = test_compare_results(result, expect)
    if verbose or not ok:
        print(f"=== working on expr: {expr}")
    if not ok:
        print(f"*** failure! got {result} but expected {expect}")


def test_main():
    parser = set_op_make_parser(test_universe, test_get_set_by_name)
    tests = test_exprs_get()
    tests = tests.splitlines()
    tests = test_remove_empty_strings(tests)
    for test in tests:
        expr, expect = test.split("|")
        result = set_op_parse_expr(parser, expr)
        if "Fail" in expect:
            expect = None
        else:
            expect = expect.split(",")
            expect = test_remove_empty_strings(expect)
            expect = [int(n) for n in expect]
            expect = set(expect)
        test_report_results(expr, result, expect)


if __name__ == "__main__":
    test_main()
