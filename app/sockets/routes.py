import os
import re
import json
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from flask import current_app
from flask_socketio import emit, disconnect, join_room, leave_room
from sqlalchemy.sql.expression import func
from .decorators import (
    admin_required_for_io_with_record,
    admin_required_for_io_no_record,
    super_required_for_io,
    playback_recorded_actions,
)
from .. import db, socketio, log_print
from ..orderq import order_q, get_enter_leave_conf_sets
from ..uploads import save_and_read_csv, pending_uploads, read_test_csv_files
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
    get_current_user_or_none,
)
from ..util import (
    get_conflictbot_namespace,
    get_cache_var_dump,
    invalidate_cache_var,
    invalidate_cache_all,
)
from ..util_history import (
    get_latest_history,
    get_latest_history_status,
    get_latest_room_history_status,
)
from ..models import (
    User,
    Paper,
    Label,
    LabelType,
    FileUpload,
    UserSchema,
    PaperSchema,
    History,
    Filter,
    HistorySchema,
    FileUploadSchema,
    GlobQueue,
    GlobQueueSchema,
    get_all_rooms,
    dump_users_papers_and_conflicts,
    get_or_create_gq,
    status_str_to_enum,
    context_str_to_enum,
    try_sql_commit,
    ensure_admin,
    wipe_db_clean,
    label_str_to_enum,
)

conflictbot_namespace = get_conflictbot_namespace()

user_schema = UserSchema()
users_schema = UserSchema(many=True)
paper_schema = PaperSchema()
papers_schema = PaperSchema(many=True)
global_schema = GlobQueueSchema()
history_schema = HistorySchema(many=True)
uploads_schema = FileUploadSchema(many=True)


# Uses ECB encryption, which is probably fine for our situation.
# Key should be 16 char for AES128.
# Modified from this article:
# https://medium.com/@sachadehe/encrypt-decrypt-data-between-python-3-and-javascript-true-aes-algorithm-7c4e2fa3a9ff
def encrypt_str(raw, key):
    raw = pad(raw.encode(), 16)
    cipher = AES.new(key.encode("utf-8"), AES.MODE_ECB)
    enc = base64.b64encode(cipher.encrypt(raw))
    enc = enc.decode("utf-8")
    # log_print('encrypted: ' + enc)
    return enc


def encrypt_obj_with_oid(obj, oid, key):
    obj_string = json.dumps(obj)
    enc_string = encrypt_str(obj_string, key)
    package = {"oid": oid, "enc": enc_string}
    return package


def get_react_env_vars():
    vars = {}
    for item, value in os.environ.items():
        if item.startswith("REACT_APP"):
            vars[item] = value
    return vars


def get_grid_paper_dump(paper):
    status = "Unseen"
    sticky = False
    history = list(paper.history)
    context_sticky = context_str_to_enum("Sticky")
    context_plenary = context_str_to_enum("Plenary")
    for h in history:
        if h.context_enum == context_sticky:
            sticky = True
        elif h.context_enum >= context_plenary:  # any room
            sticky = False
            status = h.status
    paper_dump = {"nid": paper.nid, "status": status, "sticky": sticky}
    return paper_dump


def get_grid_dump():
    bar = get_bar()
    papers = Paper.query.order_by(Paper.sort_score.desc(), Paper.nid).all()
    papers_encrypted = []
    above_oids = []
    below_oids = []
    for paper in papers:
        nid = paper.nid
        oid = paper.oid
        key = paper.key
        if nid == 9999:  # do not put test paper in grid
            continue
        if paper.sort_score >= bar:  # above bar
            above_oids.append(oid)
        else:
            below_oids.append(oid)
        paper_dump = get_grid_paper_dump(paper)
        paper_enc = encrypt_obj_with_oid(paper_dump, oid, key)
        papers_encrypted.append(paper_enc)
    grid_dump = {
        "papers_encrypted": papers_encrypted,
        "above_oids": above_oids,
        "below_oids": below_oids,
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


# this is still used by conflictbot to maintain old interface
def get_all_user_list_dump():
    users = User.query.all()
    dump = get_user_list_dump(users)
    return dump


def get_paper_history_dump(paper):
    context_plenary = context_str_to_enum("Plenary")
    plenary_history = (
        History.query.filter_by(paper_id=paper.id)
        .filter(History.context_enum >= context_plenary)
        .all()
    )
    history_dump = history_schema.dump(plenary_history)
    return history_dump


def get_paper_tag_labels(paper):
    result = []
    labels = paper.tag_labels
    paper_room = None
    for label in labels:
        if label.is_cluster:  # do not show clusters
            continue
        if label.is_room:
            paper_room = "Room:" + label.name
        else:
            fmt = f"{label.label_type}:{label.name}"
            result.append(fmt)
    result.sort()
    if paper_room:  # put room at beginning of list
        result = [paper_room] + result
    result = (", ").join(result)
    return result


def is_paper_unseen(paper):
    latest = get_latest_room_history_status(paper)
    if latest:
        return False
    return True


def is_paper_sticky(paper):
    context_sticky = context_str_to_enum("Sticky")
    latest = get_latest_history(paper)
    if not latest or latest.context_enum != context_sticky:
        return False
    return True


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


def get_paper_room(paper):
    for label in paper.tag_labels:
        if label.is_room:
            return label.name
    return "Plenary"


def filters_allow_paper(paper, filters):
    sort_score = paper.sort_score
    lowRange = float(filters["lowRange"])
    highRange = float(filters["highRange"])
    filter_statuses = filters["statuses"]
    filter_only = filters["only"]
    current_room = filters["roomChoice"]
    # interface: true(low <= score)  <==>  test here: false(score < low)
    # interface: true(score < high)  <==>  test here: false(score >= high)
    if sort_score < lowRange:
        return False
    if sort_score >= highRange:
        return False
    status = get_latest_history_status(paper)
    if status not in filter_statuses:
        return False
    if "This Room Only" in filter_only and not paper_in_room(paper, current_room):
        return False
    if "Sticky Only" in filter_only and not is_paper_sticky(paper):
        return False
    if "Unseen Only" in filter_only and not is_paper_unseen(paper):
        return False
    if "Dual Only" in filter_only and paper.journal_only:
        return False
    if "Journal Only" in filter_only and not paper.journal_only:
        return False
    if "No Clusters" in filter_only and is_in_cluster(paper):
        return False
    if "No Admin Conf" in filter_only and has_chair_conflict(paper):
        return False
    if "Only Admin Conf" in filter_only and not has_chair_conflict(paper):
        return False
    return True


def paper_is_unseen_reject_below_bar(paper, bar):
    if paper.sort_score >= bar:
        return False
    if not is_paper_unseen(paper):
        return False
    status = get_latest_history_status(paper)
    if status != "Reject":
        return False
    return True


def bulk_reject_below_bar():
    bar = get_bar()
    papers = Paper.query.all()
    papers = list(papers)
    papers = [p for p in papers if paper_is_unseen_reject_below_bar(p, bar)]
    plenary = context_str_to_enum("Plenary")
    reject = status_str_to_enum("Reject")
    for paper in papers:
        history = History(paper=paper, context_enum=plenary, status_enum=reject)
        db.session.add(history)


def bulk_confirm_in_queue():
    # for all papers in queue that are unseen...
    # ...mark as "seen" with current status.
    gq = get_or_create_gq("Plenary")
    papers = Paper.query.filter_by(queue_id=gq.id).all()
    papers = list(papers)
    papers = [p for p in papers if is_paper_unseen(p)]
    plenary = context_str_to_enum("Plenary")
    tabled = status_str_to_enum("Tabled")
    for paper in papers:
        prev_history = get_latest_history(paper)
        status = prev_history.status_enum if prev_history else tabled
        history = History(paper=paper, context_enum=plenary, status_enum=status)
        db.session.add(history)


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


def get_bar():
    gq = get_or_create_gq("Plenary")  # global->Plenary
    if gq and gq.bar is not None:
        bar = gq.bar
    else:
        bar = 0
    return bar


def set_bar(bar):
    bar = float(bar)
    queues = GlobQueue.query.all()
    for gq in queues:
        gq.bar = bar
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
    filter_papers = [p for p in p_list if filters_allow_paper(p, filters)]
    return filter_papers


def set_queue(room, filters):
    filter_papers = get_filtered_papers(filters)
    solve_tsp = True
    return set_queue_to_paper_list(room, filter_papers, solve_tsp)


def filter_papers_in_queues(paper_list):
    in_queues = [paper for paper in paper_list if paper.queue_id]
    return in_queues


def get_filter_paper_counts(filter_papers):
    papers_in_queues = filter_papers_in_queues(filter_papers)
    total = len(filter_papers)
    n_in_queues = len(papers_in_queues)
    return total, n_in_queues


def get_probe_counts_msg(filter_papers):
    total, in_queues = get_filter_paper_counts(filter_papers)
    if not total:
        msg = ""
    elif not in_queues:
        msg = f"{total}"
    else:
        msg = f"{total} total (already in queues: {in_queues})"
    return msg


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
    # XXX CURRENTLY only handles gui-filter but should also text
    filters = json.loads(filter.text)
    filters["roomChoice"] = room
    log_print(f"get_ids_matching_filter filters: {filters}")
    p_list = get_filtered_papers(filters)
    ids = [p.nid for p in p_list]
    return ids


def get_id_set_from_papers_string(papers_string):
    all_ids = get_set_of_all_paper_ids()
    ids = papers_string.split("_")
    ids = [int(id) for id in ids if id.isdigit()]
    ids = set(ids)
    ids = ids & all_ids  # intersect to ensure only valid paper ids
    return ids


def set_op_leaf_filter(name, room):
    log_print(f"set_op_leaf_filter: {name} (room {room})")
    # Possible types:
    # 1) Papers:101_102_103
    # 2) Filter (like 'BelowBarFilter')
    # 3) Type:Name (like 'Room:Room_1A' or 'Area:Geometry')
    label_type, label_name = get_filter_parts(name)
    print(f"{label_type} : {label_name}")
    if label_type == "Papers":
        ids = get_id_set_from_papers_string(label_name)
        return ids
    if label_type == "Filter" or not hasattr(LabelType, label_type):
        ids = get_ids_matching_filter(label_name, room)
        return set(ids)
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


def parse_explicit_queue(room, exp):
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
            return None, solve_tsp, "Failed to parse expression for explicit queue."
    p_list = get_papers_with_ids(nids)
    return p_list, solve_tsp, ""


def set_queue_explicit(room, exp, no_tsp):
    filter_papers, solve_tsp, msg = parse_explicit_queue(room, exp)
    if filter_papers is None:
        return msg  # XXX this is actually ignored!
    if no_tsp:
        solve_tsp = False
    msg = set_queue_to_paper_list(room, filter_papers, solve_tsp)
    return msg


def probe_queue_explicit(room, exp):
    filter_papers, _, _ = parse_explicit_queue(room, exp)
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
    status_enum = status_str_to_enum(new_status)
    room_context = context_str_to_enum(room)
    if not room_context:  # just for safety default to plenary
        room_context = context_str_to_enum("Plenary")
    history = History(paper=paper, context_enum=room_context, status_enum=status_enum)
    db.session.add(history)  # commit will follow on setting current index
    return current_index, paper


def room_short_name(room):
    if room == "Plenary":
        return "P"
    return room.replace("Room_", "")


stats_table_rows = {
    "C": "Marked Conference",
    "J": "Marked Journal",
    "R": "Marked Reject",
    "T": "Marked Tabled",
    "M": "Marked (C+J+R+T)",
    "U": "Unseen",
    "A": "All Papers (M+U)",
    "S": "Stickies",
    "P": "Presumed Reject",
    "W": "Work (A-P-C-J-R)",
    "F": "Fraction (W/(A-P))",
}


def inc_paper_stats(paper, bar, counts, totals, done, sticky, presumed):
    # Gather info about paper...
    room = get_paper_room(paper)
    room = room_short_name(room)
    is_presumed_reject = False
    is_sticky = is_paper_sticky(paper)
    room_status = get_latest_room_history_status(paper)
    presumed_status = get_latest_history_status(paper)
    if room_status:
        is_done = True
        status_code = room_status[0]
    else:
        is_done = False
        status_code = "U"  # Unseen
        if paper.sort_score < bar and presumed_status == "Reject":
            # presumed reject is unseen & below bar & reject
            is_presumed_reject = True
    # Update counts...
    counts[room][status_code] += 1
    totals[room] += 1
    if is_done:
        done[room] += 1
    if is_sticky:
        sticky[room] += 1
    if is_presumed_reject:
        presumed[room] += 1


def get_work_fraction(work, total, presumed):
    denom = total - presumed
    frac = round(100.0 * work / denom) if denom else 0
    return f"{frac}%"


def collect_stats_by_room(all_rooms):
    counts = {}
    totals = {}
    done = {}
    sticky = {}
    presumed = {}  # presumed reject
    work = {}
    fraction = {}
    status_codes = list("CJRTU")  # Conference, Journal, Reject, Tabled, Unseen
    # start with all zero counts
    for room in all_rooms:
        totals[room] = 0
        done[room] = 0
        sticky[room] = 0
        presumed[room] = 0
        counts[room] = {}
        for status in status_codes:
            counts[room][status] = 0
    bar = get_bar()
    papers = Paper.query.all()
    for paper in papers:
        inc_paper_stats(paper, bar, counts, totals, done, sticky, presumed)
    for room in all_rooms:
        # Work (A-P-C-J-R)
        work[room] = totals[room] - presumed[room]
        converged_codes = ["C", "J", "R"]
        for status in converged_codes:
            work[room] -= counts[room][status]
        fraction[room] = get_work_fraction(work[room], totals[room], presumed[room])
    return status_codes, counts, totals, done, sticky, presumed, work, fraction


def append_stats_row(all_rows, col_code, row, total=None):
    colA = col_code + ": " + stats_table_rows[col_code]
    if not total:
        total = sum(row)
    full_row = [colA] + row + [total]
    all_rows[col_code] = full_row


def get_stats():
    all_rooms = get_all_rooms()
    all_rooms = [room_short_name(room) for room in all_rooms]
    stats = collect_stats_by_room(all_rooms)
    status_codes, counts, totals, done, sticky, presumed, work, fraction = stats
    all_rows = {}
    # append row for each status
    for status_code in status_codes:
        row = [counts[room][status_code] for room in all_rooms]
        append_stats_row(all_rows, status_code, row)
    # append row for total marked
    row = [done[room] for room in all_rooms]
    append_stats_row(all_rows, "M", row)
    # append row for total
    row = [totals[room] for room in all_rooms]
    append_stats_row(all_rows, "A", row)
    # append row for stickies
    row = [sticky[room] for room in all_rooms]
    append_stats_row(all_rows, "S", row)
    # append row for presumed reject
    row = [presumed[room] for room in all_rooms]
    append_stats_row(all_rows, "P", row)
    # append row for work
    row = [work[room] for room in all_rooms]
    append_stats_row(all_rows, "W", row)
    # append row for fraction
    row = [fraction[room] for room in all_rooms]
    total_frac = get_work_fraction(
        sum(work.values()), sum(totals.values()), sum(presumed.values())
    )
    append_stats_row(all_rows, "F", row, total_frac)
    # build table organized by row_order
    rows = [all_rows[row_code] for row_code in stats_table_rows]
    header = ["Status"] + all_rooms + ["All"]
    data = {"header": header, "rows": rows}
    return data


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
    show_logs = current_app.config["REACT_APP_SHOW_LOGS"]
    if show_logs is not None:
        globs["showAppLogs"] = show_logs
    current_index = globs["current"]
    paper = get_paper_at_queue_index(room, current_index)
    if paper:
        status = get_latest_history_status(paper)
        globs["current_status"] = status
        if globs["current_show"]:
            history = get_paper_history_dump(paper)
            globs["current_history"] = history
            labels = get_paper_tag_labels(paper)
            globs["current_tags"] = labels
    return globs, paper


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
    globs, current_paper = get_globs_dump_with_status(room)
    queue = {"paper_list_encrypted": paper_list, "globs": globs}
    result = (queue, current_paper)  # current paper needed by conflictbot
    return result


def clear_all_stickies():
    context_sticky = context_str_to_enum("Sticky")
    count_deleted = History.query.filter_by(context_enum=context_sticky).delete()
    log_print(f"this should clear {count_deleted} stickies")
    return count_deleted


# call users to room (bring==True) or release from (bring==False)
def call_users_to_room(room, bring):
    log_print(f"call users to room {room} ({bring})")
    gq = GlobQueue.query.filter_by(room=room).first()
    if gq:
        gq.called_users = bring
        db.session.add(gq)
    users = User.query.all()
    for user in users:
        if room_in_user_rooms(room, user):
            if bring:
                user.room_name = room
                db.session.add(user)
            elif user.room_name == room:
                user.room_name = "Plenary"
                db.session.add(user)


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
    conflictbot_enabled = conflictbot_namespace is not None
    data = {
        "user": user_dump,
        "token": user.generate_token(),  # used to remember user after page refreshes
        "paper_keys": paper_keys,
        "all_rooms": all_rooms,
        "conflictbot_enabled": conflictbot_enabled,
    }
    if user.role_is_admin:
        all_users = get_all_user_dict_dump_cached(False)
        config_name = current_app.config["CONFIG_NAME"]
        git_info = f"Running in {config_name} mode. "
        git_info += get_git_info_from_repo()
        data["all_users"] = all_users
        data["admin_key"] = current_app.config["INSTANCE"]
        data["git_info"] = git_info
    emit("server_welcome", data)
    if user.role_is_admin:
        emit_admin_uploads(False)
        emit_admin_filters(False)
    if not user.role_is_super:
        # tell all admins about this login...
        emit("server_refresh_user", user_dump, room="admin")


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
    ensure_admin()  # Ensure that special (chair) admin exists at login
    user = user_connect(auth)
    if not user:
        return False  # reject the connection
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
def user_request_grid():
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    log_print(f"{user.full_name} requested grid")
    grid_dump = get_grid_dump_cached(False)
    emit("server_set_grid", grid_dump)


@socketio.on("user_request_queue")
def user_request_queue(room):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    log_print(f"{user.full_name} requested queue for {room}")
    data, _ = get_queue_dump_cached(room, False)
    emit("server_set_queue", data)


@socketio.on("disconnect")
def io_disconnect():
    user = user_disconnect()
    if user and not user.role_is_super:
        # tell all admins about this disconnect...
        user_dump = get_one_user_dump(user)
        emit("server_refresh_user", user_dump, room="admin")
        invalidate_user_dict_cache()


@socketio.on("admin_bring_to_room")
@admin_required_for_io_no_record
def admin_bring_to_room(gui_data):
    if not conflictbot_namespace:
        return  # only useful in online setting
    bring = gui_data["bring"]
    room = gui_data["room"]
    log_print(f"admin request to bring ({bring}) to room {room}")
    call_users_to_room(room, bring)
    try_sql_commit()
    all_users = get_all_user_dict_dump_cached(True)
    data = {"room": room, "bring": bring, "all_users": all_users}
    emit("server_call_to_room", data, broadcast=True)
    globs, _ = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_user_list()
    conflictbots_broadcast_call_to_room(room)


@socketio.on("admin_bring_to_all_rooms")
@admin_required_for_io_no_record
def admin_bring_to_all_rooms():
    if not conflictbot_namespace:
        return  # only useful in online setting
    conflictbots_broadcast_call_to_room(False)


@socketio.on("admin_prev_paper")
@admin_required_for_io_with_record
def admin_prev_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, -1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_next_paper")
@admin_required_for_io_with_record
def admin_next_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_advance_queue")
@admin_required_for_io_with_record
def admin_advance_queue(data):
    room = data["roomChoice"]
    status_update = data["newStatus"]
    log_print(f"admin request to advance queue in {room} with status {status_update}")
    before_index, paper = update_current_paper_status(room, status_update)
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_grid_cache()
    invalidate_queue_cache(room)
    update = {
        "queue_index": before_index,
        "grid_nid": paper.nid,
        "status": status_update,
    }
    update_encrypted = encrypt_obj_with_oid(update, paper.oid, paper.key)
    globs, current_paper = get_globs_dump_with_status(room)
    # globs['update'] = update # only send encrypted version!
    globs["update_encrypted"] = update_encrypted
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_show_current")
@admin_required_for_io_with_record
def admin_show_current(room):
    log_print(f"admin request for show paper in {room}")
    show_current_paper(room)
    try_sql_commit()
    invalidate_queue_cache(room)
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_hide_queue")
@admin_required_for_io_with_record
def admin_hide_queue(data):
    room = data["roomChoice"]
    hide = data["hide"]
    message = data["message"]
    log_print(f"admin request for hide queue {room}: {hide} {message}")
    set_hide_queue(room, hide, message)
    try_sql_commit()
    invalidate_queue_cache(room)
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)
    if hide:
        reply = "Queue is now hidden for everyone except the admin."
    else:
        reply = "Queue is now visible for everyone."
    data = {"message": reply, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_queue")
@admin_required_for_io_with_record
def admin_set_queue(filters):
    room = filters["roomChoice"]
    log_print(f"admin request for set queue in {room}: {filters}")
    msg = set_queue(room, filters)
    try_sql_commit()
    queue, current_paper = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    globs = queue["globs"]
    conflictbots_broadcast_conflicts(globs, current_paper)
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
        log_print(f"server_send_one_filter {data}")
        emit("server_send_one_filter", data)
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


@socketio.on("admin_probe_queue")
@admin_required_for_io_no_record
def admin_probe_queue(filters):
    log_print(f"admin probe queue: {filters}")
    filter_papers = get_filtered_papers(filters)
    msg = get_probe_counts_msg(filter_papers)
    emit("server_probe_count", msg)


@socketio.on("admin_probe_text")
@admin_required_for_io_no_record
def admin_probe_queue_explicit(data):
    room = data["roomChoice"]
    explicit = data["explicit"].strip()
    log_print(f"admin request for probe explicit queue {room}: {explicit}")
    if explicit:
        msg = probe_queue_explicit(room, explicit)
    else:
        msg = ""
    emit("server_probe_text_count", msg)


@socketio.on("admin_set_text_filter")
@admin_required_for_io_with_record
def admin_set_text_filter(data):
    room = data["roomChoice"]
    explicit = data["explicit"]
    no_tsp = data["noTSP"] if "noTSP" in data else False
    log_print(
        f"admin request for set explicit queue {room}: {explicit} (no tsp {no_tsp})"
    )
    msg = set_queue_explicit(room, explicit, no_tsp)
    try_sql_commit()
    queue, current_paper = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    globs = queue["globs"]
    conflictbots_broadcast_conflicts(globs, current_paper)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_get_stats")
@admin_required_for_io_no_record
def admin_get_stats():
    log_print("admin_get_stats")
    stats = get_stats()
    emit("server_send_stats", stats)


@socketio.on("admin_set_bar")
@admin_required_for_io_with_record
def admin_set_bar(bar):
    log_print(f"admin request set bar to {bar}")
    set_bar(bar)
    try_sql_commit()
    globs, _ = get_globs_dump_with_status("Plenary")
    emit("server_set_globs", globs, broadcast=True)  # bar is in globs
    grid_dump = get_grid_dump_cached(True)
    emit("server_set_grid", grid_dump, broadcast=True)
    message = f"Bar is now updated to: {bar}"
    data = {"message": message, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_bulk_action")
@admin_required_for_io_with_record
def admin_bulk_action(data):
    is_queue_not_bar = data["isQueueNotBar"]
    end_text = "confirm in queue" if is_queue_not_bar else "reject below bar"
    msg = f"got request admin_bulk_action: {end_text})"
    log_print(msg)
    if is_queue_not_bar:
        bulk_confirm_in_queue()
    else:
        bulk_reject_below_bar()
    success = try_sql_commit()
    invalidate_grid_cache()
    grid_dump = get_grid_dump_cached(True)
    emit("server_set_grid", grid_dump, broadcast=True)
    if success:
        msg = f"Bulk {end_text} completed."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Error in bulk action ({end_text})."
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_clear_stickies")
@admin_required_for_io_with_record
def admin_clear_stickies():
    msg = "got request admin_clear_stickies"
    log_print(msg)
    count = clear_all_stickies()
    if count:
        success = try_sql_commit()
    if count and success:
        grid_dump = get_grid_dump_cached(True)
        emit("server_set_grid", grid_dump, broadcast=True)
        msg = f"All {count} stickies are now cleared."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = "No stickies were cleared."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)


@socketio.on("user_set_sticky")
def user_set_sticky(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    log_print(f"user request for set sticky: {data}")
    nid = data["nid"]
    status = data["status"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    context_sticky = context_str_to_enum("Sticky")
    status_enum = status_str_to_enum(status)
    history = History(paper=paper, context_enum=context_sticky, status_enum=status_enum)
    db.session.add(history)
    if try_sql_commit():
        invalidate_grid_cache()
        emit("server_set_sticky", nid, broadcast=True)
        message = f"Sticky filed for paper {nid} ({status})."
        data = {"message": message, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to file sticky for paper {nid} ({status})."
        log_print(msg)
        broadcast_admin_alert("Server Error", msg)


@socketio.on("user_change_password")
def user_change_password(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
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


#################################################
#
# Conflictbot below here:
#
#################################################


def conflictbots_broadcast_user_list():
    if not conflictbot_namespace:
        return
    users_dump = get_all_user_list_dump()
    all_rooms = get_all_rooms()
    msg_data = {"roomNames": all_rooms, "userMappings": users_dump}
    emit("user-list", msg_data, namespace=conflictbot_namespace, broadcast=True)


def conflictbots_broadcast_call_to_room(room):
    if not conflictbot_namespace:
        return
    if not room:
        room = "ALL"
    log_print(f"call-to-room: {room}")
    emit("call-to-room", room, namespace=conflictbot_namespace, broadcast=True)


def conflictbots_broadcast_conflicts(globs, current_paper):
    if not conflictbot_namespace:
        return
    room = globs["room"]
    hide = globs["hide_queue"]
    show = globs["current_show"]
    if hide:
        show = False
    # if hide: queue is hidden so there are NO CONFLICTS:
    if hide or not current_paper or not current_paper.conf_users:
        nid = 0
        oid = ""
        conflict_emails = []
    else:
        nid = current_paper.nid
        oid = current_paper.oid
        conflict_list = list(current_paper.conf_users)
        conflict_emails = get_user_list_emails(conflict_list)
    data = {
        "room": room,
        "paper": nid,
        "paper_oid": oid,
        "show": show,
        "emails": conflict_emails,
    }
    emit("conflicts", data, namespace=conflictbot_namespace, broadcast=True)


@socketio.on("connect", namespace=(conflictbot_namespace or "disabled"))
def conflictbot_connect():
    if not conflictbot_namespace:
        return
    log_print("conflictbot connected")
    log_print("sending user list.")
    # broadcast user list and status to all conflictbots, including this one
    conflictbots_broadcast_user_list()
    # need to send all rooms.
    all_rooms = get_all_rooms()
    for room in all_rooms:
        globs, current_paper = get_globs_dump_with_status(room)
        conflictbots_broadcast_conflicts(globs, current_paper)


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
    emit_admin_uploads(True)
    emit_admin_filters(True)
    if header_type == "users":
        disconnect_all_users()
        return
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
        playback_recorded_actions()


@socketio.on("admin_refresh_conflictbot")
@admin_required_for_io_no_record
def admin_refresh_conflictbot(room):
    log_print(f"admin_refresh_conflictbot for {room}...")
    if conflictbot_namespace:
        emit("refresh", room, namespace=conflictbot_namespace, broadcast=True)
