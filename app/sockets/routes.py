import os
import re
import json
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from flask import current_app, session
from flask_socketio import Namespace, emit, disconnect
from sqlalchemy.sql.expression import func
from .decorators import admin_required_for_io, super_required_for_io
from .. import db, socketio
from ..util import read_text_from_file
from ..models import (
    User,
    Paper,
    Label,
    LabelType,
    FileUpload,
    UserSchema,
    PaperSchema,
    History,
    HistoryContext,
    Query,
    HistorySchema,
    FileUploadSchema,
    GlobQueue,
    GlobQueueSchema,
    all_queue_rooms,
    get_or_create_gq,
    status_str_to_enum,
    context_str_to_enum,
    insert_test_paper,
    try_sql_commit,
    ensure_admin,
    wipe_db_clean,
)
from ..orderq import order_q, get_enter_leave_conf_sets
from ..util import (
    get_current_user_or_none,
    get_latest_history,
    get_latest_history_status,
    get_latest_room_history_status,
)
from ..uploads import save_and_read_csv, pending_uploads

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
    # print('encrypted: ' + enc)
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
    stickie = False
    history = list(paper.history)
    context_stickie = int(HistoryContext.Stickie)
    context_plenary = int(HistoryContext.Plenary)
    for h in history:
        if h.context_enum == context_stickie:
            stickie = True
        elif h.context_enum >= context_plenary:  # any room
            stickie = False
            status = h.status
    paper_dump = {"nid": paper.nid, "status": status, "stickie": stickie}
    return paper_dump


def get_grid_dump_by_ids():
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
    return papers_encrypted, above_oids, below_oids


def get_grid_dump():
    papers_encrypted, above_oids, below_oids = get_grid_dump_by_ids()
    grid_dump = {
        "papers_encrypted": papers_encrypted,
        "above_oids": above_oids,
        "below_oids": below_oids,
    }
    return grid_dump


def get_user_list_dump(users, sort=True):
    user_list = list(users)  # in case it was a set
    if sort:
        # currently sorts on full name. later: last name???
        user_list = sorted(user_list, key=lambda u: u.full_name)
    # later see if we can use users schema for this...???
    list_dump = []
    for user in user_list:
        user_dump = user_schema.dump(user)
        list_dump.append(user_dump)
    return list_dump


def get_user_list_emails(users):
    user_list = list(users)  # in case it was a set
    emails = []
    for user in user_list:
        emails.append(user.email)
    return emails


def get_all_user_list_dump():
    users = User.query.all()
    dump = get_user_list_dump(users)
    return dump


def get_paper_conflicts_dump(paper):
    user_list = paper.conf_users
    conflict_dump = get_user_list_dump(user_list)
    return conflict_dump


def get_paper_history_dump(paper):
    context_plenary = int(HistoryContext.Plenary)
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
        s = f"{label.label_type}_{label.name}"
        if label.is_room:
            paper_room = s
        else:
            result.append(s)
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


def is_paper_stickie(paper):
    context_stickie = int(HistoryContext.Stickie)
    latest = get_latest_history(paper)
    if not latest or latest.context_enum != context_stickie:
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


def room_to_letter_code(room):
    if room == "Plenary":
        return "P"
    if room.startswith("Room_"):
        return room[-1]  # just the last letter
    return None


def filter_only_contains_room(filter_only):
    for filt in filter_only:
        letter = room_to_letter_code(filt)
        if letter:
            return letter
    return None


def paper_in_room(paper, room):
    for label in paper.tag_labels:
        if label.is_room and label.name == room:
            return True
    return False


def include_paper_in_queue(paper, filters):
    sort_score = paper.sort_score
    lowRange = float(filters["lowRange"])
    highRange = float(filters["highRange"])
    filter_statuses = filters["statuses"]
    filter_only = filters["only"]
    # interface: true(low <= score)  <==>  test here: false(score < low)
    # interface: true(score < high)  <==>  test here: false(score >= high)
    if sort_score < lowRange:
        return False
    if sort_score >= highRange:
        return False
    status = get_latest_history_status(paper)
    if status not in filter_statuses:
        return False
    if "Stickie Only" in filter_only and not is_paper_stickie(paper):
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
    room_filter = filter_only_contains_room(filter_only)
    if room_filter and not paper_in_room(paper, room_filter):
        return False
    return True


def paper_is_unseen_reject_below_bar(paper):
    bar = get_bar()
    sort_score = paper.sort_score
    if sort_score >= bar:
        return False
    if not is_paper_unseen(paper):
        return False
    status = get_latest_history_status(paper)
    if status != "Reject":
        return False
    return True


def get_all_unseen_reject_below_bar_papers():
    papers = Paper.query.all()
    list_papers = list(papers)
    filter_papers = [p for p in list_papers if paper_is_unseen_reject_below_bar(p)]
    return filter_papers


def bulk_reject_below_bar():
    papers = get_all_unseen_reject_below_bar_papers()
    context_plenary = int(HistoryContext.Plenary)
    status_enum = status_str_to_enum("Reject")
    for paper in papers:
        history = History(
            paper=paper, context_enum=context_plenary, status_enum=status_enum
        )
        db.session.add(history)
    if try_sql_commit():
        return True
    msg = "failed commit in bulk_reject_below_bar"
    print(msg)
    broadcast_admin_alert("Server Error", msg)
    return False


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
    if not try_sql_commit():
        msg = f"failed to set queue index in room {room} (inc {zero_or_inc})"
        print(msg)
        broadcast_admin_alert("Server Error", msg)


def get_bar():
    gq = get_or_create_gq("Plenary")  # global->Plenary
    bar = gq.bar
    return bar


def set_bar(bar):
    bar = float(bar)
    queues = GlobQueue.query.all()
    for gq in queues:
        gq.bar = bar
        db.session.add(gq)
    if not try_sql_commit():
        msg = "failed to set bar"
        print(msg)
        broadcast_admin_alert("Server Error", msg)


def clear_queue(room):
    gq = get_or_create_gq(room)
    papers = Paper.query.filter_by(queue_id=gq.id).all()
    papers = list(papers)
    n = len(papers)
    print(f"clearing queue for {room} -- {n} papers")
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
    if solve_tsp:
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


def get_all_and_filter_papers(filters):
    papers = Paper.query.all()
    list_papers = list(papers)
    filter_papers = [p for p in list_papers if include_paper_in_queue(p, filters)]
    return list_papers, filter_papers


def set_queue(room, filters):
    _, filter_papers = get_all_and_filter_papers(filters)
    solve_tsp = True
    return set_queue_to_paper_list(room, filter_papers, solve_tsp)


def get_filter_paper_count(filters):
    _, filter_papers = get_all_and_filter_papers(filters)
    return len(filter_papers)


area_prefix = "Area-"
cluster_prefix = "Cluster-"


def parse_explicit_queue(exp):
    exp = exp.strip()
    if not exp or exp == "_CLEAR_":
        return None, None, []
    if exp.startswith(area_prefix):
        label_type = int(LabelType.Area)
        label_name = exp.replace(area_prefix, "")
        return label_type, label_name, None
    if exp.startswith(cluster_prefix):
        label_type = int(LabelType.Cluster)
        label_name = exp.replace(cluster_prefix, "")
        return label_type, label_name, None
    # now assume numeric csv
    nums = re.sub("[^0-9]+", ",", exp)  # replace all non-digits with comma
    nums = re.sub(",+", ",", nums)  # eliminate repeated commas
    nums = nums.split(",")
    nums = [int(n) for n in nums if n]  # the if clause requires non empty str
    return None, None, nums


def get_paper_from_list_by_nid(p_list, nid):
    filter_papers = [p for p in p_list if p.nid == nid]
    if len(filter_papers) == 1:
        return filter_papers[0]
    # possibly zero papers match (ok), but would be weird if more than 1
    return None


def clean_filter_list(p_list, nid_list):
    select_papers = [p for p in p_list if p.nid in nid_list]
    filter_papers = [get_paper_from_list_by_nid(select_papers, nid) for nid in nid_list]
    clean_list = []
    for p in filter_papers:
        if p is not None and p not in clean_list:
            clean_list.append(p)
    return clean_list


def set_queue_explicit(room, exp):
    label_type, label_name, nid_list = parse_explicit_queue(exp)
    print("explicit queue:", label_type, label_name, nid_list)
    if label_type is not None:
        label = (
            Label.query.filter_by(type_enum=label_type)
            .filter_by(name=label_name)
            .first()
        )
        if not label:
            msg = f"No matched label for explicit queue: ({label_name})"
            print(msg)
            return msg
        filter_papers = list(label.tag_papers)
        solve_tsp = True
    else:
        papers = Paper.query.all()
        p_list = list(papers)
        filter_papers = clean_filter_list(p_list, nid_list)
        solve_tsp = False  # do not reorder papers on explicit numeric list
    msg = set_queue_to_paper_list(room, filter_papers, solve_tsp)
    return msg


def update_last_seen(user, room):
    user.last_seen = func.now()
    user.last_seen_in = room
    db.session.add(user)
    if not try_sql_commit():
        msg = f"failed to update user time last seen for {user.full_name}"
        print(msg)


def show_current_paper(room):
    gq = get_or_create_gq(room)
    gq.current_show = True
    gq.current_start = func.now()
    db.session.add(gq)
    if not try_sql_commit():
        msg = "failed to show current paper"
        print(msg)
        broadcast_admin_alert("Server Error", msg)


def set_hide_queue(room, hide, message):
    gq = get_or_create_gq(room)
    gq.hide_queue = hide
    gq.message = message
    if not hide:  # if transition from hide to show queue...
        gq.current_show = False  # then hide the current paper.
        gq.current_show_enter = 0  # and do not show enter/leave.
    db.session.add(gq)
    if not try_sql_commit():
        msg = "failed to hide queue"
        print(msg)
        broadcast_admin_alert("Server Error", msg)


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
        room_context = int(HistoryContext.Plenary)
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
    show_logs = os.getenv("REACT_APP_SHOW_LOGS")
    if show_logs is not None:
        globs["showAppLogs"] = show_logs == "True"
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
    return queue, current_paper  # cur paper needed by conflictbot


def get_git_info_from_file():
    basedir = os.path.abspath(os.path.dirname(__file__))
    md = "\n\n### (no git info available)\n"
    info_file = os.path.join(basedir, "../../git-info.md")
    if os.path.exists(info_file):
        md = read_text_from_file(info_file)
    return md


def info_to_md(info):
    result = "\n\n### Git Version (only shown to Admins)\n\n"
    for key in info:
        result += f"* {key}: {info[key]}\n\n"
    return result


def get_git_info_from_env():
    env_info = os.environ.get("HEPCAT_GIT_INFO")
    if not env_info:
        return None
    json_info = env_info.replace("'", '"')  # replace single w double
    info = json.loads(json_info)
    md = info_to_md(info)
    return md


def get_about_md(append_git_info):
    basedir = os.path.abspath(os.path.dirname(__file__))
    about_file = os.path.join(basedir, "../../public/about/about.md")
    md = read_text_from_file(about_file)
    if append_git_info:
        info = get_git_info_from_env()
        # if not info:
        #     info = get_git_info_from_file()
        if info:
            md += info
    return md


def clear_all_stickies():
    context_stickie = int(HistoryContext.Stickie)
    count_deleted = History.query.filter_by(context_enum=context_stickie).delete()
    print(f"this should clear {count_deleted} stickies")
    if not try_sql_commit():
        return 0
    return count_deleted


def call_users_to_room(room):
    users = User.query.all()
    if room == "Plenary":
        for user in users:
            if user.in_room:
                user.in_room = None
                db.session.add(user)
        gqs = GlobQueue.query.all()
        for gq in gqs:
            is_plenary = gq.room == room
            gq.called_users = is_plenary
            db.session.add(gq)
    else:  # not Plenary
        letter = room_to_letter_code(room)
        for user in users:
            if user.rooms and letter in user.rooms:
                user.in_room = letter
                db.session.add(user)
        gq = GlobQueue.query.filter_by(room=room).first()
        if gq:
            gq.called_users = True
            db.session.add(gq)
        gq = GlobQueue.query.filter_by(room="Plenary").first()
        if gq:
            gq.called_users = False
            db.session.add(gq)
    if not try_sql_commit():
        msg = f"error in call users to room {room}"
        print(msg)
        broadcast_admin_alert("Server Error", msg)


def get_unconflicted_paper_keys(user):
    conflict_papers = list(user.conf_papers)
    conflict_ids = [p.nid for p in conflict_papers]
    all_papers = Paper.query.all()
    unconficted = {}
    for p in all_papers:
        if p.nid not in conflict_ids:
            entry = {"nid": p.nid, "key": p.key}
            unconficted[p.oid] = entry
    return unconficted


###########
#
# Decorator (communication) functions mostly below here:
#
###########


def broadcast_admin_alert(title, body):
    data = {"title": title, "body": body, "admin_only": True}
    emit("server_send_alert", data, broadcast=True)


@socketio.on("connect")
def io_connect(auth):
    ensure_admin()  # Esure that special (chair) admin exists at login

    print(f'Received connection request from {auth.get("email")}')
    email_lower = auth.get("email", "").lower()
    user = User.query.filter_by(email=email_lower).first()
    if user is None or not user.verify_password(auth.get("password", "")):
        # invalid user or password, reject the connection
        return False

    # valid user, accept the connection and remember it in the session
    session["user_id"] = user.id

    print(f"client connected - send welcome to {user.full_name}")
    user_dump = user_schema.dump(user)
    about_md = get_about_md(user.role_is_admin)
    # print(about_md)
    # config_vars = get_react_env_vars()
    # later: 'config': config_vars }
    paper_keys = get_unconflicted_paper_keys(user)
    data = {"user": user_dump, "about": about_md, "paper_keys": paper_keys}
    if user.role_is_admin:
        all_users = get_all_user_list_dump()
        data["all_users"] = all_users
        data["admin_key"] = current_app.config["INSTANCE"]
    emit("server_welcome", data)
    if user.role_is_admin:
        emit_admin_uploads(False)
        emit_admin_queries(False)


@socketio.on("user_ping")
def user_ping(room):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    update_last_seen(user, room)
    print(f"ping from {user.full_name} in room {room}")


@socketio.on("user_request_grid")
def user_request_grid():
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print(f"{user.full_name} requested grid")
    grid_dump = get_grid_dump()
    emit("server_set_grid", grid_dump)


@socketio.on("user_request_queue")
def user_request_queue(room):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print(f"{user.full_name} requested queue for {room}")
    data, _ = get_queue(room)
    update_last_seen(user, room)
    emit("server_set_queue", data)


@socketio.on("user_request_refresh")
def user_request_refresh():
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print(f"{user.full_name} requested refresh")
    all_users = get_all_user_list_dump()
    emit("server_refresh_users", all_users)


@socketio.on("disconnect")
def io_disconnect():
    user_name = "Unknown User"
    user = get_current_user_or_none()
    if user:
        user_name = user.full_name
    print(f"{user_name} - client disconnected")


@socketio.on("admin_bring_to_room")
@admin_required_for_io
def admin_bring_to_room(room):
    print(f"admin request to bring to room {room}")
    call_users_to_room(room)
    all_users = get_all_user_list_dump()
    data = {"room": room, "all_users": all_users}
    emit("server_call_to_room", data, broadcast=True)
    globs, _ = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_user_list()
    conflictbots_broadcast_call_to_room(room)


@socketio.on("admin_bring_to_all_rooms")
@admin_required_for_io
def admin_bring_to_all_rooms():
    conflictbots_broadcast_call_to_room(False)


@socketio.on("admin_prev_paper")
@admin_required_for_io
def admin_prev_paper(room):
    print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, -1)  # also "hides" current
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_next_paper")
@admin_required_for_io
def admin_next_paper(room):
    print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, +1)  # also "hides" current
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_advance_queue")
@admin_required_for_io
def admin_advance_queue(data):
    room = data["roomChoice"]
    status_update = data["newStatus"]
    print(f"admin request to advance queue in {room} with status {status_update}")
    before_index, paper = update_current_paper_status(room, status_update)
    zero_or_inc_current_index(room, +1)  # also "hides" current
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
@admin_required_for_io
def admin_show_current(room):
    print(f"admin request for show paper in {room}")
    show_current_paper(room)
    globs, current_paper = get_globs_dump_with_status(room)
    emit("server_set_globs", globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs, current_paper)


@socketio.on("admin_hide_queue")
@admin_required_for_io
def admin_hide_queue(data):
    room = data["roomChoice"]
    hide = data["hide"]
    message = data["message"]
    print(f"admin request for hide queue {room}: {hide} {message}")
    set_hide_queue(room, hide, message)
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
@admin_required_for_io
def admin_set_queue(filters):
    room = filters["roomChoice"]
    print(f"admin request for set queue in {room}:", filters)
    msg = set_queue(room, filters)
    queue, current_paper = get_queue(room)
    emit("server_set_queue", queue, broadcast=True)
    globs = queue["globs"]
    conflictbots_broadcast_conflicts(globs, current_paper)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_save_query")
@admin_required_for_io
def admin_save_query(filters):
    print("admin save query:", filters)
    json_string = json.dumps(filters)
    # print('json: '+json_string)
    name = filters["queryName"]
    query = Query.query.filter_by(name=name).first()
    if query:  # if it exists... update:
        query.json = json_string
    else:  # otherwise... create:
        query = Query(name=name, json=json_string)
    db.session.add(query)
    if try_sql_commit():
        emit_admin_queries(True)
        msg = f"Saved query named: {name}."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Failed to add query {name} ({json_string})."
        print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_load_query")
@admin_required_for_io
def admin_load_query(name):
    print("admin load query:", name)
    query = Query.query.filter_by(name=name).first()
    if query:
        filters = json.loads(query.json)
        print("server_send_query", filters)
        emit("server_send_query", filters)
    else:
        msg = f"Cannot find query with name: {name}"
        print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_delete_query")
@admin_required_for_io
def admin_delete_query(name):
    print("admin delete query:", name)
    query = Query.query.filter_by(name=name).first()
    if not query:
        msg = f"Cannot find query with name: {name}"
        print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    num_deleted = Query.query.filter_by(name=name).delete()
    print(f"delete {num_deleted} queries (should be 1).")
    if try_sql_commit():
        emit_admin_queries(True)
        msg = f"Deleted query with name: {name}"
        print(msg)
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Cannot delete query with name: {name}"
        print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_probe_queue")
@admin_required_for_io
def admin_probe_queue(filters):
    print("admin probe queue:", filters)
    count = get_filter_paper_count(filters)
    emit("server_probe_count", count)


@socketio.on("admin_set_queue_explicit")
@admin_required_for_io
def admin_set_queue_explicit(data):
    room = data["roomChoice"]
    explicit = data["explicit"]
    print(f"admin request for set explicit queue {room}: {explicit}")
    msg = set_queue_explicit(room, explicit)
    queue, current_paper = get_queue(room)
    emit("server_set_queue", queue, broadcast=True)
    globs = queue["globs"]
    conflictbots_broadcast_conflicts(globs, current_paper)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_bar")
@admin_required_for_io
def admin_set_bar(bar):
    print(f"admin request set bar to {bar}")
    set_bar(bar)
    globs, _ = get_globs_dump_with_status("Plenary")  # YYY ???
    emit("server_set_globs", globs, broadcast=True)
    grid_dump = get_grid_dump()
    emit("server_set_grid", grid_dump, broadcast=True)
    message = f"Bar is now updated ({bar})."
    data = {"message": message, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_bulk_reject")
@admin_required_for_io
def admin_bulk_reject():
    msg = "got request admin_bulk_reject"
    print(msg)
    success = bulk_reject_below_bar()
    if success:
        grid_dump = get_grid_dump()
        emit("server_set_grid", grid_dump, broadcast=True)
        msg = "Mark unseen reject papers below bar as now seen."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)


@socketio.on("admin_clear_stickies")
@admin_required_for_io
def admin_clear_stickies():
    msg = "got request admin_clear_stickies"
    print(msg)
    count = clear_all_stickies()
    if count:
        grid_dump = get_grid_dump()
        emit("server_set_grid", grid_dump, broadcast=True)
        msg = f"All {count} stickies are now cleared."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = "No stickies were cleared."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)


@socketio.on("admin_add_test_paper")
def admin_add_test_paper():
    print("admin_add_test_paper")
    count = insert_test_paper()
    if count >= 0:
        msg = f"Added test paper with {count} conflicts."
        msgType = "success"
    elif count == -1:
        msg = "No need to add test paper 9999 - it already exists."
        msgType = "warning"
    else:  # -2
        msg = "Failed to add test paper, for unknown reason."
        msgType = "danger"
    data = {"message": msg, "type": msgType}
    emit("server_send_flasher", data)


@socketio.on("user_set_stickie")
def user_set_stickie(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print("user request for set stickie:", data)
    nid = data["nid"]
    status = data["status"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    context_stickie = int(HistoryContext.Stickie)
    status_enum = status_str_to_enum(status)
    history = History(
        paper=paper, context_enum=context_stickie, status_enum=status_enum
    )
    db.session.add(history)
    if try_sql_commit():
        emit("server_set_stickie", nid, broadcast=True)
        message = f"Stickie filed for paper {nid} ({status})."
        data = {"message": message, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to file stickie for paper {nid} ({status})."
        print(msg)
        broadcast_admin_alert("Server Error", msg)


@socketio.on("user_change_password")
def user_change_password(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    new_password = data["password"]
    for_email = data["forEmail"]
    if for_email:
        for_user = User.query.filter_by(email=for_email).first()
        if not user.role_is_admin or not for_user:
            success = False
        else:
            success = True
            for_name = for_user.full_name
            message = f"You have changed the password for {for_name}."
    else:
        success = True
        for_user = user  # self
        message = "You have successfully changed your password."
    if success:
        print(f"change password for {for_user.full_name}")
        for_user.password = new_password
        db.session.add(for_user)
        if try_sql_commit():
            message_type = "success"
        else:
            success = False
    if not success:
        message = "Error setting password."
        message_type = "warning"
    reply = {"message": message, "type": message_type}
    emit("server_send_flasher", reply)


def emit_admin_queries(broadcast):
    queries = Query.query.all()
    names = [query.name for query in queries]
    names.sort()
    emit("server_send_queries", names, broadcast=broadcast)


#################################################
#
# Conflictbot below here:
#
#################################################


# FUTURE: move these two functions below conflictbot_namespace declaration
# and eliminate class.
class Conflictbot(Namespace):
    def on_connect(self):
        print("conflictbot connected:", self)
        print("sending user list.")
        users_dump = get_all_user_list_dump()
        emit("user-list", users_dump)
        # next we can broadcast status to all conflictbots, including this one
        # need to send all rooms.
        for room in all_queue_rooms:
            globs, current_paper = get_globs_dump_with_status(room)
            conflictbots_broadcast_conflicts(globs, current_paper)

    def on_disconnect(self):
        print("conflictbot disconnected")


# change this variable to pull from environment
# conflictbot_namespace = '/lurk_NxtCmHS8aDj6'
# unfortunately this is not set yet: current_app.config['HEPCAT_CONFLICTBOT_SOCKET']
conflictbot_namespace = os.environ.get("HEPCAT_CONFLICTBOT_SOCKET")
if conflictbot_namespace:
    conflictbot_namespace = "/" + conflictbot_namespace
    print("conflictbot_namespace: ", conflictbot_namespace)
else:
    conflictbot_namespace = "/lurk_NxtCmHS8aDj6"  # in case not set in environ
    print("set conflictbot_namespace to default")


def conflictbots_broadcast_user_list():
    users_dump = get_all_user_list_dump()
    emit("user-list", users_dump, namespace=conflictbot_namespace, broadcast=True)


def conflictbots_broadcast_call_to_room(room):
    if not room:
        room = "ALL"
    print("call-to-room:", room)
    emit("call-to-room", room, namespace=conflictbot_namespace, broadcast=True)


def conflictbots_broadcast_conflicts(globs, current_paper):
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


socketio.on_namespace(Conflictbot(conflictbot_namespace))


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
    emit("server_file_uploads", data, broadcast=broadcast)


@socketio.on("admin_file_upload")
@admin_required_for_io
def admin_upload_file(file):
    print("admin_file_upload")
    filename = "upload.csv"
    msg, logout, header_type = save_and_read_csv(file, filename)
    if msg != "already_sent_flash_msg":
        if msg:
            msg = f"File upload ({header_type}) successful. {msg}"
        else:
            msg = "Unable to read the uploaded CSV. Perhaps the header is wrong?"
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
    if logout:
        emit("server_logout_user", broadcast=True)  # everyone
    elif header_type in ["chair_scores", "history"]:
        # reload will cause new globals and grid, which are needed
        emit("server_reload_user", broadcast=True)
    else:
        emit_admin_uploads(True)
        emit_admin_queries(True)


@socketio.on("admin_wipe_database")
@super_required_for_io
def admin_wipe_database():
    print("about to wipe database...")
    wipe_db_clean()

    # log user out
    session["user_id"] = None
    disconnect()
