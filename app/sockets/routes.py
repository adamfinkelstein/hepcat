import os
import re
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app
from flask_socketio import (
    emit,
    join_room,
    leave_room,
    ConnectionRefusedError,
)
from sqlalchemy.sql.expression import func
from .decorators import (
    admin_required_for_io_with_record,
    admin_required_for_io_no_record,
    login_required_for_io,
    super_required_for_io,
    playback_recorded_actions,
    get_user_or_disconnect,
)
from .. import db, socketio, log_print
from ..order import order_q, get_enter_leave_conf_sets
from ..uploads import remove_upload_folder
from ..uploads.insert import (
    save_and_read_csv,
    pending_uploads,
    read_test_csv_files,
    init_grid_from_bbs,
)
from .set_op import set_op_make_parser, set_op_parse_expr
from .git_info import get_git_info_from_repo
from .users import (
    user_connect,
    user_disconnect,
    user_has_socket,
    forget_user_socket,
    disconnect_all_users,
    user_record_socket_and_session,
    get_user_id_from_session,
    connected_user_ids_list,
    disconnect_user_by_id,
)
from ..util import (
    get_cache_var_dump,
    invalidate_cache_var,
    invalidate_cache_all,
)
from ..models.settings import (
    setting_float_set,
    setting_float_get,
    setting_bool_get,
    setting_bool_set,
)
from ..models.history_util import (
    get_paper_bbs_status,
    get_latest_history,
    get_latest_history_status,
    get_latest_room_history_status,
    get_room_history_count,
    history_query_for_paper_above_context,
    history_query_for_paper,
)
from ..models.tables import (
    User,
    Paper,
    Label,
    LabelType,
    FileUpload,
    History,
    Filter,
    status_str_to_enum,
    context_str_to_enum,
    get_all_rooms,
)
from ..models.schemas import (
    user_schema,
    paper_schema,
    global_schema,
    history_schema,
    uploads_schema,
)
from ..models.helpers import (
    dump_users_papers_and_conflicts,
    get_or_create_gq,
    try_sql_commit,
    ensure_supers,
    wipe_db_clean,
)
from ..models.label_util import (
    label_str_to_enum,
)


def encrypt_str(raw, key):
    # Convert key to 16 bytes for AES-128 (pad with zeros if short)
    key_bytes = key.encode("utf-8")[:16].ljust(16, b"\0")
    nonce = os.urandom(12)  # random 12-byte nonce
    aesgcm = AESGCM(key_bytes)
    ciphertext = aesgcm.encrypt(nonce, raw.encode("utf-8"), None)
    encrypted_data = nonce + ciphertext
    return base64.b64encode(encrypted_data).decode("utf-8")


def debug_obj_string(str):
    beg = str[:8]
    end = str[-8:]
    n = len(str)
    debug = f"{beg}...{n}...{end}"
    return debug


def debug_encoding(jsn, enc):
    d_jsn = debug_obj_string(jsn)
    d_enc = debug_obj_string(enc)
    debug = f"[ {d_jsn} | {d_enc} ]"
    return debug


def encrypt_obj_with_oid(obj, oid, key):
    jsn_string = json.dumps(obj)
    enc_string = encrypt_str(jsn_string, key)
    package = {"oid": oid, "enc": enc_string}
    debug = None  # debug_encoding(jsn_string, enc_string)
    if debug:
        package["debug"] = debug
    return package


def count_papers_in_all_queues():
    count = 0
    papers = Paper.query.all()
    for paper in papers:
        if paper.queue_id:
            count += 1
    return count


def tabled_or_ready(status):
    if status == "Tabled":
        return "Tabled"
    return "Ready"


def tabled_sticky_or_ready(status):
    if status == "Tabled":
        return "Tabled-Discuss"
    return "Ready"


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


def get_encrypted_grid_entry(paper):
    paper_dump = get_grid_paper_dump(paper)
    paper_enc = encrypt_obj_with_oid(paper_dump, paper.oid, paper.key)
    return paper_enc


def get_grid_dump():
    papers = Paper.query.order_by(Paper.sort_score.desc(), Paper.nid).all()
    papers_encrypted = []
    for paper in papers:
        nid = paper.nid
        if nid == 9999:  # do not put test paper in grid
            continue
        paper_enc = get_encrypted_grid_entry(paper)
        papers_encrypted.append(paper_enc)
    bar = setting_float_get("bar")
    grid_dump = {
        "papers_encrypted": papers_encrypted,
        "bar": bar,
    }
    return grid_dump


def get_grid_dump_cached(refresh_cache):
    grid_dump = get_cache_var_dump("grid", get_grid_dump, None, refresh_cache)
    return grid_dump


def get_queue_cache_name(room):
    name = f"queue_{room}"
    return name


def get_queue_dump_cached(room, refresh_cache):
    name = get_queue_cache_name(room)
    queue_dump = get_cache_var_dump(name, get_queue, room, refresh_cache)
    return queue_dump


def invalidate_grid_cache():
    invalidate_cache_var("grid")


def invalidate_queue_cache(room):
    name = get_queue_cache_name(room)
    invalidate_cache_var(name)


def get_one_user_dump(user):
    user_dump = user_schema.dump(user)
    user_dump["is_online"] = user_has_socket(user.id)
    return user_dump


def get_user_list_dump(users, sort=True):
    user_list = list(users)  # in case it was a set or something
    if sort:
        # currently sorts on full name
        user_list = sorted(user_list, key=lambda u: u.full_name)
    list_dump = []
    for user in user_list:
        user_dump = get_one_user_dump(user)
        list_dump.append(user_dump)
    return list_dump


def get_user_dict_dump(users):
    user_list = list(users)  # in case it was a set or something
    dict_dump = {}
    for user in user_list:
        if not user.role_is_super:
            email = user.email
            user_dump = get_one_user_dump(user)
            dict_dump[email] = user_dump
    return dict_dump


def get_user_list_emails(users):
    user_list = list(users)  # in case it was a set
    emails = []
    for user in user_list:
        emails.append(user.email)
    return emails


# send users as dictionary indexed by email
def get_all_user_dict_dump():
    users = User.query.all()
    dump = get_user_dict_dump(users)
    return dump


def get_all_user_dict_dump_cached(refresh_cache):
    user_dump = get_cache_var_dump(
        "user_dict", get_all_user_dict_dump, None, refresh_cache
    )
    return user_dump


def invalidate_user_dict_cache():
    invalidate_cache_var("user_dict")


def get_paper_all_history_dump(paper):
    query = history_query_for_paper(paper)
    plenary_history = query.all()
    history_dump = history_schema.dump(plenary_history)
    return history_dump


def get_paper_meeting_history_dump(paper):
    query = history_query_for_paper_above_context(paper, "Plenary")
    plenary_history = query.all()
    history_dump = history_schema.dump(plenary_history)
    return history_dump


def get_paper_tag_labels(paper):
    bar_type = "Bar"
    bar_enum = label_str_to_enum(bar_type)
    bar_name = "Below" if paper.below_bar else "Above"
    bar_tuple = (-bar_enum, bar_name, bar_type)
    all_tups = [bar_tuple]
    labels = paper.tag_labels
    for label in labels:
        if not label.is_cluster:  # do not show clusters
            # fmt = f"{label.label_type}:{label.name}" # now done after sort
            tuple = (-label.type_enum, label.name, label.label_type)
            all_tups.append(tuple)
    all_tups.sort()  # descending order of type_enum and then ascending by name
    all_tags = [f"{tup[2]}:{tup[1]}" for tup in all_tups]
    all_tags = (", ").join(all_tags)
    return all_tags


def is_paper_ready(paper):
    latest = get_latest_room_history_status(paper)
    if latest:  # marked in meeting room (includes presumed-R)
        return False
    bbs = get_paper_bbs_status(paper)
    if bbs == "Tabled":
        return False
    return True


def is_paper_accepted(paper):
    latest = get_latest_room_history_status(paper)
    if latest == "Journal" or latest == "Conference":
        return True
    return False


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


def room_in_user_rooms(room, user):
    if not user.rooms:
        return False
    is_in_rooms = room in user.rooms
    return is_in_rooms


def paper_in_room(paper, room):
    for label in paper.tag_labels:
        if label.is_room and label.name == room:
            return True
    return False


def get_paper_room_name(paper):
    for label in paper.tag_labels:
        if label.is_room:
            return label.name
    return "Plenary"


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


def paper_is_ready_reject_below_bar(paper):
    if not paper.below_bar:
        return False
    if not is_paper_ready(paper):
        return False
    status = get_latest_history_status(paper)
    if status != "Reject":
        return False
    return True


# This code is now dead:
# def bulk_reject_below_bar():
#     papers = Paper.query.all()
#     papers = list(papers)
#     papers = [p for p in papers if paper_is_ready_reject_below_bar(p)]
#     plenary = context_str_to_enum("Plenary")
#     reject = status_str_to_enum("Reject")
#     for paper in papers:
#         history = History(paper=paper, context_enum=plenary, status_enum=reject)
#         db.session.add(history)


def bulk_confirm_in_queue():
    # for all papers in queue that are ready...
    # ...mark as "seen" with current status.
    gq = get_or_create_gq("Plenary")
    papers = Paper.query.filter_by(queue_id=gq.id).all()
    papers = list(papers)
    # papers = [p for p in papers if is_paper_ready(p)] all in queue
    sticky = context_str_to_enum("Sticky")
    plenary = context_str_to_enum("Plenary")
    tabled = status_str_to_enum("Tabled")
    count = 0
    for paper in papers:
        prev_history = get_latest_history(paper)
        if not prev_history:  # just in case
            continue
        # only consider stickies that mark as converged
        status = prev_history.status_enum
        if prev_history.context_enum != sticky or status == tabled:
            continue
        history = History(paper=paper, context_enum=plenary, status_enum=status)
        db.session.add(history)
        count += 1
    log_print(f"bulk_confirm_in_queue: {count} stickies confirmed.")


def zero_or_inc_current_index(room, zero_or_inc):
    gq = get_or_create_gq(room)
    gq.current_show_enter = zero_or_inc
    if zero_or_inc == 0:
        gq.current = 0
    elif zero_or_inc == -1:
        gq.current -= 1
    elif zero_or_inc == +1:
        gq.current += 1
    else:
        gq.current = -1  # default = no current
        gq.current_show_enter = 0
    gq.current_show = False
    db.session.add(gq)


def clear_queue(room):
    gq = get_or_create_gq(room)
    papers = Paper.query.filter_by(queue_id=gq.id).all()
    papers = list(papers)
    n = len(papers)
    log_print(f"clearing queue for {room} -- {n} papers")
    for paper in papers:
        paper.queue_id = None
        paper.queue_order = 0
        db.session.add(paper)
    return gq


def message_from_set_queue(count, skipped, over_max):
    msg = f"Set queue with {count} papers."
    if skipped:
        msg += f" Skipped {skipped} because already in other queues."
    if over_max:
        msg += f" Selected random subset of {over_max} to stay under time budget."
    return msg


def set_queue_to_paper_list(room, paper_list, solve_tsp):
    gq = clear_queue(room)
    # remove any papers already in other queues...
    keepers = []
    skipped = 0
    for paper in paper_list:
        if paper.queue_id:
            skipped += 1
        else:
            keepers.append(paper)
    over_max = False
    tsp_disabled = current_app.config["HEPCAT_TSP_DISABLED"]
    if solve_tsp and not tsp_disabled:
        order_papers, over_max = order_q(keepers, room)
    else:
        order_papers = keepers
    count = 0
    for paper in order_papers:
        paper.queue_id = gq.id
        paper.queue_order = count + 1  # queue order starts at 1
        db.session.add(paper)
        count += 1
    if count:
        zero_or_inc_current_index(room, 0)  # does commit!
    else:
        zero_or_inc_current_index(room, -100)  # empty queue = no current
    msg = message_from_set_queue(count, skipped, over_max)
    return msg


def get_filtered_papers(filters):
    papers = Paper.query.all()
    p_list = list(papers)
    sanitized = sanitize_paper_filters(filters)
    filter_papers = [p for p in p_list if filters_allow_paper(p, sanitized)]
    return filter_papers


def set_queue(room, filters):
    filter_papers = get_filtered_papers(filters)
    solve_tsp = True
    return set_queue_to_paper_list(room, filter_papers, solve_tsp)


def filter_papers_in_queues(paper_list):
    in_queues = [paper for paper in paper_list if paper.queue_id]
    return in_queues


def get_filter_paper_counts(filter_papers):
    if not filter_papers:
        return 0, 0
    papers_in_queues = filter_papers_in_queues(filter_papers)
    total = len(filter_papers)
    n_in_queues = len(papers_in_queues)
    return total, n_in_queues


def get_probe_counts_msg(filter_papers):
    total, in_queues = get_filter_paper_counts(filter_papers)
    if not total:
        msg = "no matching papers"
    elif not in_queues:
        msg = f"{total}"
    else:
        msg = f"{total} total (already in queues: {in_queues})"
    return msg


# XXX TODO: Factor out filter / set code starting here
# Roughly 250 lines of code.


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


def exp_is_only_nid_list(exp):
    no_comma = exp.replace(",", "")
    return no_comma.isdigit()


def get_nid_list(exp):
    nids = exp.split(",")
    nids = [int(nid) for nid in nids if nid]  # ignore blanks
    return nids


PARSE_ERR_MSG = "Failed to parse expression in text filter."


def parse_text_filter(room, exp):
    exp = remove_all_whitespace(exp)
    if not exp:
        return [], False, ""
    if exp_is_only_nid_list(exp):
        solve_tsp = False
        nids = get_nid_list(exp)
    else:
        solve_tsp = True
        nids = get_ids_by_set_op(room, exp)
        if nids is None:
            return None, solve_tsp, PARSE_ERR_MSG
    p_list = get_papers_with_ids(nids)
    return p_list, solve_tsp, ""


def set_queue_by_text_filter(room, exp, no_tsp):
    filter_papers, solve_tsp, msg = parse_text_filter(room, exp)
    if filter_papers is None:
        return msg
    if no_tsp:
        solve_tsp = False
    msg = set_queue_to_paper_list(room, filter_papers, solve_tsp)
    return msg


def probe_queue_by_text_filter(room, exp):
    filter_papers, _, _ = parse_text_filter(room, exp)
    if filter_papers is None:
        return PARSE_ERR_MSG
    msg = get_probe_counts_msg(filter_papers)
    return msg


def show_current_paper(room):
    gq = get_or_create_gq(room)
    gq.current_show = True
    gq.current_start = func.now()
    db.session.add(gq)


def set_hide_queue(room, hide, message):
    gq = get_or_create_gq(room)
    gq.hide_queue = hide
    gq.message = message
    if not hide:  # if transition from hide to show queue...
        gq.current_show = False  # then hide the current paper.
        gq.current_show_enter = 0  # and do not show enter/leave.
    db.session.add(gq)


def get_globs_dump(room):
    gq = get_or_create_gq(room)
    globs = global_schema.dump(gq)
    return globs


def update_current_paper_status(room, new_status):
    globs = get_globs_dump(room)
    current_index = globs["current"]
    paper = get_paper_at_queue_index(room, current_index)
    if not paper:
        return None, None
    status_enum = status_str_to_enum(new_status)
    room_context = context_str_to_enum(room)
    if not room_context:  # just for safety default to plenary
        room_context = context_str_to_enum("Plenary")
    history = History(paper=paper, context_enum=room_context, status_enum=status_enum)
    db.session.add(history)  # commit will follow on setting current index
    return current_index, paper


def get_paper_at_queue_index(room, index):
    if not room or index < 0:
        return None
    gq = get_or_create_gq(room)
    add_one = index + 1
    paper = Paper.query.filter_by(queue_order=add_one).filter_by(queue_id=gq.id).first()
    return paper


# def shows status and history for current paper when revealed
def get_globs_dump_with_status(room):
    globs = get_globs_dump(room)
    show_logs = current_app.config["HEPCAT_SHOW_LOGS"]
    if show_logs is not None:
        globs["showAppLogs"] = show_logs
    current_index = globs["current"]
    paper = get_paper_at_queue_index(room, current_index)
    if paper:
        status = get_latest_history_status(paper)
        globs["current_status"] = status
        if globs["current_show"]:
            history = get_paper_meeting_history_dump(paper)
            globs["current_history"] = history
            labels = get_paper_tag_labels(paper)
            globs["current_tags"] = labels
    return globs


def get_queue(room):
    globs = get_globs_dump(room)
    current_index = globs["current"]
    gq = get_or_create_gq(room)
    papers = Paper.query.filter_by(queue_id=gq.id).order_by(Paper.queue_order).all()
    paper_list = []
    paper_prev = None
    for index, paper in enumerate(papers):
        _, conf_curr, enter, leave = get_enter_leave_conf_sets(paper_prev, paper)
        paper_dump = paper_schema.dump(paper)
        if index <= current_index:  # only show status for history
            paper_dump["status"] = get_latest_room_history_status(paper)
        paper_dump["conflicts"] = get_user_list_dump(conf_curr)
        paper_dump["enter"] = get_user_list_dump(enter)
        paper_dump["leave"] = get_user_list_dump(leave)
        paper_enc = encrypt_obj_with_oid(paper_dump, paper.oid, paper.key)
        paper_list.append(paper_enc)
        paper_prev = paper
    globs = get_globs_dump_with_status(room)
    queue = {"paper_list_encrypted": paper_list, "globs": globs}
    return queue


def clear_all_stickies():
    context_sticky = context_str_to_enum("Sticky")
    count_deleted = History.query.filter_by(context_enum=context_sticky).delete()
    log_print(f"this should clear {count_deleted} stickies")
    return count_deleted


def disconnect_non_admin_users():
    connected_user_ids = connected_user_ids_list()
    print(f"disconnect_non_admin_users: {connected_user_ids}")
    for id in connected_user_ids:
        user = User.query.filter_by(id=id).first()
        if user and not user.role_is_admin:
            print(f"disconnecting user {user.email}")
            disconnect_user_by_id(id)


def get_unconflicted_paper_keys(user):
    conflict_papers = list(user.conf_papers)
    conflict_ids = [p.nid for p in conflict_papers]
    all_papers = Paper.query.all()
    paper_keys = {}
    for p in all_papers:
        if p.nid not in conflict_ids:
            entry = {"nid": p.nid, "key": p.key}
            paper_keys[p.oid] = entry
    return paper_keys


def get_paper_keys_cache_name(user):
    uid = user.id
    name = f"paper_keys_{uid}"
    return name


def get_unconflicted_paper_keys_cached(user):
    name = get_paper_keys_cache_name(user)
    paper_keys = get_cache_var_dump(name, get_unconflicted_paper_keys, user, False)
    return paper_keys


def broadcast_admin_alert(title, body):
    data = {"title": title, "body": body, "admin_only": True}
    emit("server_send_alert", data, room="admin")


def login_user_and_send_welcome(user):
    log_print(f"client connected - send welcome to {user.full_name}")
    user_dump = get_one_user_dump(user)
    paper_keys = get_unconflicted_paper_keys_cached(user)
    all_rooms = get_all_rooms()
    data = {
        "user": user_dump,
        "token": user.generate_token(),  # used to remember user after page refreshes
        "paper_keys": paper_keys,
        "all_rooms": all_rooms,
    }
    if user.role_is_admin:
        # data["all_users"] = all_users
        data["admin_key"] = current_app.config["APP_INSTANCE"]
        data["git_info"] = get_git_info_from_repo()
    emit("server_welcome", data)
    if user.role_is_admin:
        disable = setting_bool_get("disable_logins")
        emit("server_relay_disable_logins", disable)
        emit_admin_uploads(False)
        emit_admin_filters(False)
    # if not user.role_is_super: (better safe than sorry)
    # tell all admins about this login...
    all_users = get_all_user_dict_dump_cached(True)
    emit("server_refresh_all_users", all_users, room="admin")


def update_all_paper_bar_status(bar):
    papers = Paper.query.all()
    for paper in papers:
        below_bar = paper.sort_score < bar
        paper.below_bar = below_bar
        db.session.add(paper)


###########
#
# Decorator (communication) functions mostly below here:
#
###########


@socketio.on_error()
def socketio_error_handler(exc):
    current_app.logger.exception("An error has occurred in a Socket.IO handler")
    emit(
        "server_send_flasher",
        {
            "message": (
                "An unexpected server error has occurred. Please notify "
                "an administrator."
            ),
            "type": "danger",
        },
    )


@socketio.on("connect")
def io_connect(auth):
    ensure_supers()  # Ensure that special (chair) admin exists at login
    user, msg = user_connect(auth)
    if not user:
        raise ConnectionRefusedError(msg)  # reject the connection
    if user.role_is_admin:
        join_room("admin")
    # valid user, accept the connection and send welcome
    if try_sql_commit():
        login_user_and_send_welcome(user)


@socketio.on("admin_become_user")
@admin_required_for_io_no_record
def admin_become_user(email):
    new_user = User.query.filter_by(email=email).first()
    if not new_user:
        # this should never happen.
        # maybe rare race condition on old user list at client.
        msg = f"Failed attempt to switch to unknown user ({email})."
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    # forget socket under old user id
    old_user_id = get_user_id_from_session()
    forget_user_socket(old_user_id)
    # new user may or may not be admin.
    # if yes: already were in admin room - stay.
    # if not: need to leave admin room.
    if not new_user.role_is_admin:
        leave_room("admin")
    # record new user socket and session, then emit welcome
    user_record_socket_and_session(new_user)
    login_user_and_send_welcome(new_user)


@socketio.on("user_request_grid")
@get_user_or_disconnect
def user_request_grid(user):
    log_print(f"{user.full_name} requested grid")
    grid_dump = get_grid_dump_cached(False)
    emit("server_set_grid", grid_dump)


@socketio.on("user_request_queue")
@get_user_or_disconnect
def user_request_queue(user, room):
    log_print(f"{user.full_name} requested queue for {room}")
    data = get_queue_dump_cached(room, False)
    emit("server_set_queue", data)


@socketio.on("disconnect")
def io_disconnect(reason):
    log_print(f"io_disconnect with reason: {reason}")
    user = user_disconnect()
    if user and not user.role_is_super:
        # tell all admins about this disconnect...
        user_dump = get_one_user_dump(user)
        emit("server_refresh_user", user_dump, room="admin")
        invalidate_user_dict_cache()


@socketio.on("admin_prev_paper")
@admin_required_for_io_with_record
def admin_prev_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, -1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    globs = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)


@socketio.on("admin_next_paper")
@admin_required_for_io_with_record
def admin_next_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    globs = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)


@socketio.on("admin_advance_queue")
@admin_required_for_io_with_record
def admin_advance_queue(data):
    room = data["roomChoice"]
    status_update = data["updateStatus"]
    log_print(f"admin request to advance queue in {room} with status {status_update}")
    index_before_advance, paper = update_current_paper_status(room, status_update)
    if not paper:
        msg = "Attempt to advance queue beyond end"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_grid_cache()
    invalidate_queue_cache(room)
    grid_paper_dump = get_grid_paper_dump(paper)
    update = {
        "room": room,
        "queue_index": index_before_advance,
        "nid": paper.nid,
        "status": status_update,
        "grid_update": grid_paper_dump,
    }
    update_encrypted = encrypt_obj_with_oid(update, paper.oid, paper.key)
    globs = get_globs_dump_with_status(room)
    # globs['update'] = update # only send encrypted version!
    globs["update_encrypted"] = update_encrypted
    emit("server_set_globs", globs, broadcast=True)


@socketio.on("admin_show_current")
@admin_required_for_io_with_record
def admin_show_current(room):
    log_print(f"admin request for show paper in {room}")
    show_current_paper(room)
    try_sql_commit()
    invalidate_queue_cache(room)
    globs = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)


@socketio.on("admin_hide_queue")
@admin_required_for_io_with_record
def admin_hide_queue(data):
    room = data["roomChoice"]
    hide = data["hide"]
    message = data["message"]
    log_print(f"admin_hide_queue {room}: {hide} {message}")
    set_hide_queue(room, hide, message)
    try_sql_commit()
    invalidate_queue_cache(room)
    globs = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    if hide:
        reply = "Queue is now hidden for everyone except the admin."
    else:
        reply = "Queue is now visible for everyone."
    data = {"message": reply, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_queue_by_gui")
@admin_required_for_io_with_record
def admin_set_queue_by_gui(filters):
    room = filters["roomChoice"]
    log_print(f"admin request for set queue in {room}: {filters}")
    msg = set_queue(room, filters)
    try_sql_commit()
    queue = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_queue_by_text")
@admin_required_for_io_with_record
def admin_set_queue_by_text(data):
    room = data["roomChoice"]
    explicit = data["explicit"]
    no_tsp = data["noTSP"] if "noTSP" in data else False
    log_print(
        f"admin request for set explicit queue {room}: {explicit} (no tsp {no_tsp})"
    )
    msg = set_queue_by_text_filter(room, explicit, no_tsp)
    try_sql_commit()
    queue = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_save_filter")
@admin_required_for_io_with_record
def admin_save_filter(data):
    log_print(f"admin_save_filter: {data}")
    is_gui = "text" not in data
    if is_gui:
        text = json.dumps(data)
    else:
        text = data["text"]
    name = data["filterName"]
    filter = Filter.query.filter_by(name=name).first()
    if filter:  # if it exists... update:
        filter.text = text
        filter.is_gui = is_gui  # just in case
    else:  # otherwise... create:
        filter = Filter(name=name, is_gui=is_gui, text=text)
    db.session.add(filter)
    if try_sql_commit():
        emit_admin_filters(True)
        msg = f"Saved filter named: {name}."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)


@socketio.on("admin_load_filter")
@admin_required_for_io_no_record
def admin_load_filter(name):
    log_print(f"admin_load_filter: {name}")
    filter = Filter.query.filter_by(name=name).first()
    if filter:
        data = filter.text
        if filter.is_gui:
            data = json.loads(data)
        log_print(f"server_load_filter {data}")
        emit("server_load_filter", data)
    else:
        msg = f"Cannot find filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_delete_filter")
@admin_required_for_io_with_record
def admin_delete_filter(name):
    log_print(f"admin_delete_filter: {name}")
    filter = Filter.query.filter_by(name=name).first()
    if not filter:
        msg = f"Cannot find filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    num_deleted = Filter.query.filter_by(name=name).delete()
    log_print(f"delete {num_deleted} filters (should be 1).")
    if try_sql_commit():
        emit_admin_filters(True)
        msg = f"Deleted filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Cannot delete filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_probe_by_gui")
@admin_required_for_io_no_record
def admin_probe_by_gui(filters):
    log_print(f"admin probe queue: {filters}")
    filter_papers = get_filtered_papers(filters)
    msg = get_probe_counts_msg(filter_papers)
    emit("server_probe_by_gui", msg)


@socketio.on("admin_probe_by_text")
@admin_required_for_io_no_record
def admin_probe_by_text(data):
    room = data["roomChoice"]
    explicit = data["explicit"].strip()
    log_print(f"admin request for probe explicit queue {room}: {explicit}")
    if explicit:
        msg = probe_queue_by_text_filter(room, explicit)
    else:
        msg = ""
    emit("server_probe_by_text", msg)


@socketio.on("admin_set_bar")
@admin_required_for_io_with_record
def admin_set_bar(bar):
    log_print(f"admin request set bar to {bar}")
    bar = float(bar)
    setting_float_set("bar", bar)
    update_all_paper_bar_status(bar)
    init_grid_from_bbs()
    try_sql_commit()
    grid_dump = get_grid_dump_cached(True)  # refresh cache
    emit("server_set_grid", grid_dump, broadcast=True)
    message = f"Bar is now updated to: {bar}"
    data = {"message": message, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_disable_logins")
@admin_required_for_io_no_record
def admin_set_disable_logins(disable):
    log_print(f"admin_set_disable_logins {disable}")
    setting_bool_set("disable_logins", disable)
    try_sql_commit()
    emit("server_relay_disable_logins", disable, broadcast=True)
    if disable:
        disconnect_non_admin_users()


@socketio.on("admin_bulk_confirm")
@admin_required_for_io_with_record
def admin_bulk_confirm():
    msg = "got request for admin_bulk_confirm"
    log_print(msg)
    bulk_confirm_in_queue()
    success = try_sql_commit()
    # invalidate_grid_cache() # next line will do this
    grid_dump = get_grid_dump_cached(True)
    emit("server_set_grid", grid_dump, broadcast=True)
    if success:
        msg = "Completed bulk confirm in queue."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = "Error in admin_bulk_confirm."
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


# XXX This function is big and should be factored.
@socketio.on("user_set_sticky")
@login_required_for_io
def user_set_sticky(data):
    log_print(f"user request for set sticky: {data}")
    nid = data["nid"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    status_data = data["status"]
    key = data["key"]
    status = status_data
    if status == "Tabled-Discuss":
        status = "Tabled"
    is_reject = status == "Reject"
    playback = "playback" in data
    status_enum = status_str_to_enum(status)
    context_plenary = context_str_to_enum("Plenary")
    context_sticky = context_str_to_enum("Sticky")
    context = context_sticky  # default (most cases)
    auto_reject = current_app.config["HEPCAT_AUTO_REJECT"]
    if auto_reject and paper.below_bar and is_reject and not is_paper_accepted(paper):
        context = context_plenary  # Mark in Plenary instead of Sticky
    history = History(
        paper=paper, context_enum=context, status_enum=status_enum, sticky_key=key
    )
    db.session.add(history)
    if try_sql_commit():
        invalidate_grid_cache()
        data["idx"] = history.id  # same data but add id
        emit("server_confirm_sticky", data)  # just to sender
        grid_update = get_encrypted_grid_entry(paper)
        emit("server_set_sticky", grid_update, broadcast=True)
        if not playback:
            message = f"Sticky received for paper {nid} ({status_data})."
            data = {"message": message, "type": "success"}
            emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to file sticky for paper {nid} ({status_data})."
        log_print(msg)
        broadcast_admin_alert("Server Error", msg)


# XXX This function is big and should be factored.
@socketio.on("user_revoke_sticky")
@login_required_for_io
def user_revoke_sticky(data):
    log_print(f"user request to revoke sticky: {data}")
    nid = data["nid"]
    key = data["key"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    # should only be able to revoke sticky if most recent history
    latest = get_latest_history(paper)
    if not latest or latest.sticky_key != key:
        msg = f"Failed attempt to revoke sticky for paper {nid}."
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    print(f"latest before revoke: {latest}")
    context_revoke = context_str_to_enum("Revoke")
    latest.context_enum = context_revoke
    db.session.add(latest)
    print(f"latest after revoke: {latest}")
    if try_sql_commit():
        hist = get_paper_all_history_dump(paper)
        print(f"hist after revoke: {hist}")
        invalidate_grid_cache()
        grid_update = get_encrypted_grid_entry(paper)
        emit("server_set_sticky", grid_update, broadcast=True)
        playback = "playback" in data
        if not playback:
            message = f"Sticky revoked for paper {nid}!"
            data = {"message": message, "type": "success"}
            emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to revoke sticky for paper {nid} (db)."
        log_print(msg)
        broadcast_admin_alert("Server Error", msg)


# XXX This function is big and should be factored.
@socketio.on("user_change_password")
@get_user_or_disconnect
def user_change_password(user, data):
    old_password = data["oldPassword"]
    new_password = data["password"]
    for_email = data["forEmail"]
    message = None
    if for_email:
        for_user = User.query.filter_by(email=for_email).first()
        if not user.role_is_admin or not for_user:
            success = False
        else:
            success = True
            for_name = for_user.full_name
            message = f"You have changed the password for {for_name}."
    else:
        if old_password and not user.verify_password(old_password):
            success = False
            message = "Current password incorrect. Password was NOT updated."
        else:
            success = True
            for_user = user  # self
            message = "You have successfully changed your password."
    if success:
        log_print(f"change password for {for_user.full_name}")
        for_user.password = new_password
        db.session.add(for_user)
        if try_sql_commit():
            message_type = "success"
        else:
            success = False
    if not success:
        if not message:
            message = "Error setting password."
        message_type = "warning"
    reply = {"message": message, "type": message_type}
    emit("server_send_flasher", reply)


def emit_admin_filters(broadcast):
    filters = Filter.query.all()
    gui_names = [filter.name for filter in filters if filter.is_gui]
    text_names = [filter.name for filter in filters if not filter.is_gui]
    gui_names.sort()
    text_names.sort()
    names = {"gui": gui_names, "text": text_names}
    if broadcast:
        emit("server_send_filter_names", names, room="admin")
    else:  # otherwise just to the client of this request
        emit("server_send_filter_names", names)


####################################
#
# Uploads
#
####################################


def emit_admin_uploads(broadcast):
    uploads = FileUpload.query.all()
    uploads_dump = uploads_schema.dump(uploads)
    pending = pending_uploads(uploads)
    data = {"uploads": uploads_dump, "pending": pending}
    if broadcast:
        emit("server_file_uploads", data, room="admin")
    else:  # otherwise just to the client of this request
        emit("server_file_uploads", data)


@socketio.on("admin_file_upload")
@admin_required_for_io_no_record
def admin_upload_file(contents):
    invalidate_cache_all()  # just in case this changes some state
    header_type = save_and_read_csv(contents)
    if header_type and not try_sql_commit():
        header_type = None
    if not header_type:
        msg = "Unable to read the uploaded CSV. Perhaps the header is wrong?"
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
    if header_type == "users":
        disconnect_all_users()
        return  # logging out all users, so no need to send updates
    emit_admin_uploads(True)
    emit_admin_filters(True)
    if header_type in ["chair", "history"]:
        # reload will cause new globals and grid, which are needed
        emit("server_reload_user", broadcast=True)
    msg = dump_users_papers_and_conflicts("After Upload")
    msg = f"File upload ({header_type}) successful. {msg}"
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


def wipe_db_and_disconnect_all():
    log_print("about to wipe database...")
    invalidate_cache_all()
    disconnect_all_users()  # do this first because users in db
    wipe_db_clean()
    remove_upload_folder()  # clean up any files


@socketio.on("admin_wipe_database")
@super_required_for_io
def admin_wipe_database():
    wipe_db_and_disconnect_all()


@socketio.on("admin_load_database")
@super_required_for_io
def admin_load_database():
    wipe_db_and_disconnect_all()
    read_test_csv_files()
    try_sql_commit()
    if current_app.config["HEPCAT_TEST_ACTIONS"]:
        playback_recorded_actions(user_set_sticky)
