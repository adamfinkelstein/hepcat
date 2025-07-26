# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import re
import json
from .. import log_print
from .set_ops import set_op_make_parser, set_op_parse_expr
from ..models.label_util import label_str_to_enum
from ..models.history_util import (
    get_paper_bbs_status,
    get_latest_history_status,
    get_room_history_count,
)
from ..models.tables import (
    Paper,
    Label,
    LabelType,
    Filter,
    context_str_to_enum,
)


def paper_in_room(paper, room):
    for label in paper.tag_labels:
        if label.is_room and label.name == room:
            return True
    return False


def tabled_or_ready(status):
    if status == "Tabled":
        return "Tabled"
    return "Ready"


def tabled_sticky_or_ready(status):
    if status == "Tabled":
        return "Tabled-Discuss"
    return "Ready"


def get_paper_room_name(paper):
    for label in paper.tag_labels:
        if label.is_room:
            return label.name
    return "Plenary"


def get_grid_paper_dump(paper):
    history = list(paper.history)
    below_bar = paper.below_bar
    paper_room = get_paper_room_name(paper)
    context_revoke = context_str_to_enum("Revoke")
    context_bbs = context_str_to_enum("BBS")
    context_sticky = context_str_to_enum("Sticky")
    # context_plenary = context_str_to_enum("Plenary")
    status = None  # should be overwritten
    idx = 0
    for h in history:
        # contexts: Revoke,BBS,Sticky,Plenary,Room...
        if h.context_enum == context_revoke:
            continue
        elif h.context_enum == context_bbs:
            # Start meeting showing BBS Tabled.
            status = tabled_or_ready(h.status)
            idx = h.id
        elif h.context_enum == context_sticky:
            status = tabled_sticky_or_ready(h.status)
            idx = h.id
        else:  # h.context_enum >= context_plenary:  # must be a room
            # Note "presumed reject" set in Plenary by init_grid_from_bbs().
            status = h.status  # C,J,R,T
            idx = h.id
    paper_dump = {
        "nid": paper.nid,
        "idx": idx,
        "below_bar": below_bar,
        "status": status,
        "paper_room": paper_room,
    }
    return paper_dump


# This is not efficient but ok for now.
# Among other things, called by filters_allow_paper(),
# and get_id_set_by_grid_status(), so could be slow.
# That could be improved by checking grid cache first.
def get_paper_grid_status(paper):
    dump = get_grid_paper_dump(paper)
    status = dump["status"]
    return status


def get_papers_with_ids(ids):
    papers = Paper.query.all()
    p_list = list(papers)
    p_list = [p for p in p_list if p.nid in ids]
    return p_list


def get_filter_parts(name):
    if ":" in name:
        label_type, label_name, *_ = name.split(":")
        return label_type, label_name
    return "Filter", name


def is_in_cluster(paper):
    for label in paper.tag_labels:
        if label.is_cluster:
            return True
    return False


def has_chair_conflict(paper):
    conf_users = paper.conf_users
    for user in conf_users:
        if user.role_is_admin:
            return True
    return False


# includes all GUI checkboxes for filtering papers except for "this room only"
paper_check_functions = {
    "No Clusters": (is_in_cluster, False),
    "No Chair Conf": (has_chair_conflict, False),
    "Only Chair Conf": (has_chair_conflict, True),
    "Journal Only": (lambda p: p.journal_only, True),
    "Dual Only": (lambda p: p.journal_only, False),
    "No Exceptions": (lambda p: p.has_exception, False),
    "Below Bar": (lambda p: p.below_bar, True),
    "Above Bar": (lambda p: p.below_bar, False),
}


def checked_filters_allow_paper(paper, filter_only):
    for filter_label in paper_check_functions:
        if filter_label in filter_only:
            check_func, expected_bool = paper_check_functions[filter_label]
            if check_func(paper) != expected_bool:
                return False
    return True


def filters_allow_paper(paper, filters):
    # note that filters have been sanitized by calling the function above.
    sort_score = paper.sort_score
    use_above_score = filters["useAboveScore"]
    use_below_score = filters["useBelowScore"]
    above_score = filters["aboveScore"]
    below_score = filters["belowScore"]
    filter_statuses = filters["statuses"]
    filter_only = filters["only"]
    current_room = filters["roomChoice"]
    # interface: true(low <= score)  <==>  test here: false(score < low)
    # interface: true(score < high)  <==>  test here: false(score >= high)
    if use_above_score and sort_score < above_score:
        return False
    if use_below_score and sort_score >= below_score:
        return False
    # status = get_latest_history_status(paper)  # old status checkboxes
    status = get_paper_grid_status(paper)
    if status not in filter_statuses:
        return False
    # "This Room Only" is a special case handled here because it needs room name.
    if "This Room Only" in filter_only and not paper_in_room(paper, current_room):
        return False
    # handle all other "filter_only" GUI checkbox filters here
    allow = checked_filters_allow_paper(paper, filter_only)
    return allow


def ensure_key(d, key, default):
    if key not in d:
        d[key] = default


def ensure_float_key(d, key, default):
    ensure_key(d, key, default)
    try:
        d[key] = float(d[key])
    except ValueError:
        d[key] = float(default)


def sanitize_paper_filters(filters):
    sanitized = filters.copy()
    ensure_key(sanitized, "roomChoice", "Plenary")
    ensure_key(sanitized, "statuses", [])
    ensure_key(sanitized, "only", [])
    ensure_key(sanitized, "useAboveScore", False)
    ensure_key(sanitized, "useBelowScore", False)
    ensure_float_key(sanitized, "aboveScore", 0.0)
    ensure_float_key(sanitized, "belowScore", 0.0)
    return sanitized


def get_filtered_papers(filters):
    papers = Paper.query.all()
    p_list = list(papers)
    sanitized = sanitize_paper_filters(filters)
    filter_papers = [p for p in p_list if filters_allow_paper(p, sanitized)]
    return filter_papers


def get_ids_matching_filter(name, room):
    filter = Filter.query.filter_by(name=name).first()
    if not filter:
        msg = f"Cannot find filter with name: {name}"
        log_print(msg)
        empty_list = []
        return empty_list
    if filter.is_gui:
        filters = json.loads(filter.text)
        filters["roomChoice"] = room
        log_print(f"get_ids_matching_filter filters: {filters}")
        p_list = get_filtered_papers(filters)
        ids = [p.nid for p in p_list]
    else:
        # This is a text filter, perhaps using set operations.
        # This is essentially a recursive call on text filters.
        expr = filter.text
        ids = get_ids_by_set_op(room, expr)
        if ids is None:
            ids = []  # silent fail if parsing saved filter
    return ids


def get_id_set_from_papers_string(papers_string):
    all_ids = get_set_of_all_paper_ids()
    ids = papers_string.split("_")
    ids = [int(id) for id in ids if id.isdigit()]
    ids = set(ids)
    ids = ids & all_ids  # intersect to ensure only valid paper ids
    return ids


def get_id_set_by_check_filter(filter_label):
    filter_label = filter_label.replace("_", " ")
    # print(f"get_id_set_by_check_filter: {filter_label}")
    papers = Paper.query.all()
    if filter_label in paper_check_functions:  # otherwise silent fail
        check_func, expected_bool = paper_check_functions[filter_label]
        papers = [p for p in papers if check_func(p) == expected_bool]
    ids = [p.nid for p in papers]
    ids = set(ids)
    return ids


def get_id_set_by_status_type(status, get_status_func):
    papers = Paper.query.all()
    papers = [p for p in papers if get_status_func(p) == status]
    ids = [p.nid for p in papers]
    ids = set(ids)
    return ids


def get_id_set_by_status(status):
    return get_id_set_by_status_type(status, get_latest_history_status)


def get_id_set_by_grid_status(status):
    return get_id_set_by_status_type(status, get_paper_grid_status)


def get_id_set_by_bbs_status(status):
    return get_id_set_by_status_type(status, get_paper_bbs_status)


def get_id_set_by_seen_count(count):
    count = int(count)
    papers = Paper.query.all()
    papers = [p for p in papers if get_room_history_count(p) >= count]
    ids = [p.nid for p in papers]
    ids = set(ids)
    return ids


def paper_score_above(paper, score):
    return paper.sort_score >= score


def paper_score_below(paper, score):
    return paper.sort_score < score


def debug_print_paper_id_set(ids):
    debug = list(ids)
    debug = [str(id) for id in debug]
    debug = ", ".join(debug)
    print(debug)


# get papers by testing against a given score,
#   using one of the two preceding test functions (above or below)
def get_id_set_by_score(score, score_test):
    score = float(score)
    print("testing against score:", score)
    papers = Paper.query.all()
    papers = [p for p in papers if score_test(p, score)]
    ids = [p.nid for p in papers]
    ids = set(ids)
    # debug_print_paper_id_set(ids)
    return ids


# Area, Cluster, Room, Exception, Tag
def get_id_set_by_label(label_type, label_name, room):
    if label_type == "Room" and label_name == "This":
        label_name = room
    label_enum = label_str_to_enum(label_type)
    label = (
        Label.query.filter_by(type_enum=label_enum).filter_by(name=label_name).first()
    )
    if not label:
        msg = f"No label with type '{label_type}' and name '{label_name}'."
        log_print(msg)
        return set()
    p_list = list(label.tag_papers)
    ids = [p.nid for p in p_list]
    return set(ids)


def set_op_leaf_filter(name, room):
    log_print(f"set_op_leaf_filter: {name} (room {room})")
    # Possible types:
    # - Papers:101_102_103
    # = Status:Type (like 'Status:Reject')
    # - Grid:Type (like 'Grid:Tabled' or 'Grid:Tabled-Discuss')
    # - BBS:Type (like 'BBS:Tabled' or 'BBS:Reject')
    # - Check:Filter_Name (like 'Check:Sticky_Only')
    # - Marked:n (like 'Marked:2')
    # - Above:score or Below:score
    # - Type:Name (like 'Room:Room_1A' or 'Area:Geometry')
    #    o Area, Cluster, Room, Exception, Tag
    # - Filter (like 'Filter:MyGreatFilter' or just 'MyGreatFilter')
    label_type, label_name = get_filter_parts(name)
    print(f"{label_type} : {label_name}")
    if label_type == "Papers":
        ids = get_id_set_from_papers_string(label_name)
        return ids
    if label_type == "Status":
        ids = get_id_set_by_status(label_name)
        return ids
    if label_type == "Grid":
        ids = get_id_set_by_grid_status(label_name)
        return ids
    if label_type == "BBS":
        ids = get_id_set_by_bbs_status(label_name)
        return ids
    if label_type == "Check":
        ids = get_id_set_by_check_filter(label_name)
        return ids
    if label_type == "Marked":
        ids = get_id_set_by_seen_count(label_name)
        return ids
    if label_type == "Above":
        ids = get_id_set_by_score(label_name, paper_score_above)
        return ids
    if label_type == "Below":
        ids = get_id_set_by_score(label_name, paper_score_below)
        return ids
    if hasattr(LabelType, label_type):  # Area, Cluster, Room, Exception, Tag
        ids = get_id_set_by_label(label_type, label_name, room)
        return ids
    # at this point, label_type should be "Filter", but check anyway:
    if label_type != "Filter" or label_name == "None":
        return set()
    if label_name == "All":
        return get_set_of_all_paper_ids()
    ids = get_ids_matching_filter(label_name, room)
    return set(ids)


def get_set_of_all_paper_ids():
    papers = Paper.query.all()
    ids = [p.nid for p in papers]
    ids = set(ids)
    return ids


def get_ids_by_set_op(room, expr):
    all_ids = get_set_of_all_paper_ids()
    parser = set_op_make_parser(all_ids, set_op_leaf_filter, room)
    ids = set_op_parse_expr(parser, expr)
    return ids


def remove_all_whitespace(exp):
    exp = re.sub(r"\s+", "", exp)
    return exp


def has_alpha(str):
    return any(c.isalpha() for c in str)


def exp_is_only_nid_list(exp):
    return not has_alpha(exp)  # has no alpha characters


def get_nid_list(exp):
    nids = re.split(r"\D+", exp)  # split on non-digits
    nids = [int(nid) for nid in nids if nid]  # ignore empty
    return nids


PARSE_ERR_MSG = "Failed to parse expression in text filter."


def parse_text_filter(room, exp):
    exp = exp.strip()
    if not exp:
        return [], False, ""
    if exp_is_only_nid_list(exp):
        solve_tsp = False
        nids = get_nid_list(exp)
    else:
        solve_tsp = True
        exp = remove_all_whitespace(exp)
        nids = get_ids_by_set_op(room, exp)
        if nids is None:
            return None, solve_tsp, PARSE_ERR_MSG
    p_list = get_papers_with_ids(nids)
    return p_list, solve_tsp, ""
