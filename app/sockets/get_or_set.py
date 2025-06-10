import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app
from sqlalchemy.sql.expression import func
from .. import db, log_print
from ..order import order_q, get_enter_leave_conf_sets
from .filters import (
    get_grid_paper_dump,
    get_filtered_papers,
    parse_text_filter,
    PARSE_ERR_MSG,
)
from .users import (
    user_has_socket,
    connected_user_ids_list,
    disconnect_user_by_id,
    disconnect_all_users,
)
from ..util import get_cache_var_dump, invalidate_cache_var, invalidate_cache_all
from ..models.settings import setting_float_get
from ..models.history_util import (
    get_paper_bbs_status,
    get_latest_history,
    get_latest_history_status,
    get_latest_room_history_status,
    history_query_for_paper_above_context,
    history_query_for_paper,
)
from ..models.tables import (
    User,
    Paper,
    History,
    status_str_to_enum,
    context_str_to_enum,
)
from ..models.schemas import (
    user_schema,
    paper_schema,
    global_schema,
    history_schema,
)
from ..models.helpers import get_or_create_gq, wipe_db_clean
from ..models.label_util import label_str_to_enum
from ..uploads import remove_upload_folder


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


# Seems unused:
# def count_papers_in_all_queues():
#     count = 0
#     papers = Paper.query.all()
#     for paper in papers:
#         if paper.queue_id:
#             count += 1
#     return count


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
    data = {"room": room, "globs": globs}
    return data


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
    data = get_globs_dump_with_status(room)
    data["paper_list_encrypted"] = paper_list
    return data


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


def update_all_paper_bar_status(bar):
    papers = Paper.query.all()
    for paper in papers:
        below_bar = paper.sort_score < bar
        paper.below_bar = below_bar
        db.session.add(paper)


def wipe_db_and_disconnect_all():
    log_print("about to wipe database...")
    invalidate_cache_all()
    disconnect_all_users()  # do this first because users in db
    wipe_db_clean()
    remove_upload_folder()  # clean up any files
