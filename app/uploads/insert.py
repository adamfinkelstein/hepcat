import os
import csv
import uuid
from .. import db, log_print, current_app
from ..util import write_data_to_file, timer_start, timer_end
from ..models.tables import (
    User,
    Paper,
    History,
    Action,
    LabelType,
    Label,
    FileUpload,
    Filter,
    context_str_to_enum,
    status_str_to_enum,
    fill_history_context_tables_and_room_list,
)
from ..models.helpers import (
    try_sql_commit,
    num_to_sid,
    sid_to_num,
    get_or_insert_role,
    dump_users_papers_and_conflicts,
    reset_all_gqs,
    ensure_all_gqs,
    ensure_screens,
)
from ..models.history_util import get_latest_history
from ..models.bar import set_bar, get_bar
from . import (
    single_quote_to_double,
    get_paper_room_name_or_none,
    get_or_make_upload_folder,
)
from .delete import delete_prev_file_uploads, delete_non_bbs_history, csvDeleteFunctions


def is_csv(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext == "csv"


def csv_row_strip_whitespace(row):
    row = [item.strip() for item in row]
    return row


def csv_row_total_content_chars(row):
    lengths = [len(item) for item in row]
    total = sum(lengths)
    return total


def read_csv_rows(filename):
    with open(filename) as f:
        csvReader = csv.reader(f)
        rows = []
        for row in csvReader:
            row = csv_row_strip_whitespace(row)
            if csv_row_total_content_chars(row) > 3:  # arb min 3 chars
                rows.append(row)
    if len(rows) < 1:
        return None, None
    header = rows[0]
    header = ",".join(header)
    rows = rows[1:]
    return header, rows


def get_csv_type(header):
    if not header:
        return None, 0
    header = header.lower()  # only check lower case
    for typ in csvHeaders:
        knownHeader = csvHeaders[typ].lower()  # lower case
        if header.startswith(knownHeader):
            cols = knownHeader.split(",")
            n_cols = len(cols)
            return typ, n_cols
    return None, 0


def keep_rows_with_n_cols(rows, n):
    rows = [row[:n] for row in rows if len(row) >= n]
    return rows


# Name,GUI,Filter
def insert_filter_rows(rows):
    count = 0
    for row in rows:
        name, is_gui, text = row
        is_gui = True if is_gui == "True" else False
        # in CSV, double quotes in JSON were replaced w single
        double_quote = single_quote_to_double(text)
        filter = Filter(name=name, is_gui=is_gui, text=double_quote)
        db.session.add(filter)
        count += 1
    return count


def keep_rows_with_unique_lowercase_emails(rows):
    uniq_emails = set()
    result = []
    for row in rows:
        email = row[0]
        email = email.lower()  # ensure emails are all lower case
        row[0] = email
        if email in uniq_emails:
            log_print(f"skipping duplicate entry for email: {email}")
            continue
        uniq_emails.add(email)
        result.append(row)
    return result


def domain_from_email(email):
    if "@" not in email:
        return None
    parts = email.split("@")
    if len(parts) < 2:
        return None
    return parts[1]


# Email,First Name,Last Name,Role,Password
def insert_user_rows(rows, hash_cache):
    ok_roles = "Admin,Chair,Backup,Screen,Outside".split(",")
    omit_domains = current_app.config["OMIT_USER_DOMAINS"]
    count = 0
    hash_count = 0
    rows = keep_rows_with_unique_lowercase_emails(rows)
    for row in rows:
        email, first_name, last_name, role_name, password = row
        domain = domain_from_email(email)
        if domain and omit_domains and domain in omit_domains:
            log_print(f"omit domain {domain} user {email}")
            continue
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        if password:
            user.password = password
        else:
            if hash_cache and email in hash_cache:
                # restore password cached from before
                hash = hash_cache[email]
                hash_count += 1
            else:
                # set to something random (to be reset later)
                hash = gen_random_key(32)
            user.password_hash = hash
        if role_name in ok_roles:
            role = get_or_insert_role(role_name)
            user.role = role
            # could potentially cache these but relatively rare
        db.session.add(user)
        count += 1
    log_print(f"added {count} users (restored {hash_count} old passwords)")
    ensure_screens()  # this will provide at least Plenary but later need to add rooms
    return count


def journal_only_from_dual(dual):
    return dual != "yes"


def gen_random_key(max_chars):
    hex = uuid.uuid4().hex
    hex = hex[:max_chars]  # 4 billion options on 8 hex digits
    return hex


def gen_unique_keys(n, max_chars):
    oids = []
    while len(oids) < n:
        oid = gen_random_key(max_chars)
        if oid not in oids:
            oids.append(oid)
    return oids


# Maybe later make this function check an environment variable
def insert_test_paper():
    nid = 9999
    paper = Paper.query.filter_by(nid=nid).first()
    if paper:
        return
    sid = num_to_sid(nid)
    oid = "test_9999"
    key = "1234567890123456"  # must be 16 characters
    thumbnail = "https://fakeimg.pl/600x450/685/f5c/?text=TEST&font_size=240&font=bebas"
    title = "Testing Conflictbot"
    abstract = "This paper should be conflicted with all users."
    paper = Paper(
        nid=nid,
        sid=sid,
        oid=oid,
        key=key,
        thumbnail=thumbnail,
        title=title,
        journal_only=False,
        abstract=abstract,
    )
    db.session.add(paper)


# Maybe later make this function check an environment variable
def insert_test_paper_conflicts():
    nid = 9999
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return
    users = User.query.all()
    count = 0
    for user in users:
        if user.role_is_admin or user.role_is_screen:
            # AF??? This test seems to fail for super?
            continue
        user.conf_papers.append(paper)
        db.session.add(user)
        count += 1
        # log_print(f'9999 conflicted with {user.full_name} ({count})')
    return count


# Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract
def insert_paper_rows(rows):
    area_type = int(LabelType.Area)
    n = len(rows)
    oids = gen_unique_keys(n, 8)
    keys = gen_unique_keys(n, 16)
    count = 0
    for row in rows:
        sid, thumbnail, title, areas, dual, abstract = row
        journal_only = journal_only_from_dual(dual)
        nid = sid_to_num(sid)
        oid = oids.pop(0)
        key = keys.pop(0)
        paper = Paper(
            nid=nid,
            sid=sid,
            oid=oid,
            key=key,
            thumbnail=thumbnail,
            title=title,
            journal_only=journal_only,
            abstract=abstract,
        )
        db.session.add(paper)
        count += 1
        label_names = areas_to_label_names(areas)
        for label_name in label_names:
            label = Label.query.filter(Label.is_area).filter_by(name=label_name).first()
            if not label:
                label = Label(type_enum=area_type, name=label_name)
                db.session.add(label)
            if label and paper:
                paper.tag_labels.append(label)
                db.session.add(paper)
    if current_app.config["MEETING_IS_ONLINE"]:
        insert_test_paper()
        log_print("inserted test paper")
    else:
        log_print("no test paper for online meeting")
    return count


def get_users_by_email():
    users = User.query.all()
    users_by_email = {}
    for user in users:
        email = user.email
        users_by_email[email] = user
    return users_by_email


def get_papers_by_sid():
    papers = Paper.query.all()
    papers_by_sid = {}
    for paper in papers:
        sid = paper.sid
        papers_by_sid[sid] = paper
    return papers_by_sid


# Submission ID,Email
def insert_conflict_rows(rows):
    count = 0
    users_by_email = get_users_by_email()
    papers_by_sid = get_papers_by_sid()
    for row in rows:
        sid, email = row
        email = email.lower()  # ensure emails are all lower case
        if email in users_by_email and sid in papers_by_sid:
            user = users_by_email[email]
            paper = papers_by_sid[sid]
            user.conf_papers.append(paper)
            db.session.add(user)
            count += 1
    if current_app.config["MEETING_IS_ONLINE"]:
        insert_test_paper_conflicts()
    return count


# Used for both Clusters and Rooms
def insert_label_rows(rows, label_dict):
    count = 0
    for row in rows:
        sid, label_name = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper and label_name in label_dict:
            label = label_dict[label_name]
            paper.tag_labels.append(label)
            db.session.add(paper)
            count += 1
    return count


def rows_to_unique_labels(rows):
    labels = [row[1] for row in rows]
    labels = list(set(labels))
    return labels


def ensure_label(label_type, name):
    label = Label.query.filter_by(type_enum=label_type).filter_by(name=name).first()
    if not label:
        label = Label(type_enum=label_type, name=name)
        db.session.add(label)
    return label


def ensure_labels_exist_dict(label_type, label_names):
    label_dict = {}
    for name in label_names:
        label = ensure_label(label_type, name)
        label_dict[name] = label
    return label_dict


# Submission ID,Cluster
def insert_cluster_rows(rows):
    cluster_type = int(LabelType.Cluster)
    label_names = rows_to_unique_labels(rows)
    label_dict = ensure_labels_exist_dict(cluster_type, label_names)
    count = insert_label_rows(rows, label_dict)
    return count


def assign_papers_without_rooms_to_plenary(plenary):
    count = 0
    papers = Paper.query.all()
    for paper in papers:
        if not get_paper_room_name_or_none(paper):
            paper.tag_labels.append(plenary)
            db.session.add(paper)
            count += 1
    log_print(f"assigned {count} papers without rooms to Plenary room")


# Submission ID,Room
def insert_paper_room_rows(rows):
    room_type = int(LabelType.Room)
    label_names = rows_to_unique_labels(rows)
    if "Plenary" not in label_names:
        label_names.append("Plenary")
    label_dict = ensure_labels_exist_dict(room_type, label_names)
    count = insert_label_rows(rows, label_dict)
    # Since paper rooms changed, update the list of rooms available.
    # Also ensure all GQs exist, and reset them.
    fill_history_context_tables_and_room_list()
    plenary = label_dict["Plenary"]
    assign_papers_without_rooms_to_plenary(plenary)
    # Note that this could lead to orphaned GQs if rooms are deleted.
    # However, they are small and few, and there is no need to clean them up.
    # Also note that uploading papers will reset all GQs.
    ensure_all_gqs()
    reset_all_gqs()
    ensure_screens()
    return count


# def sanitize_room_code(room):
#     if room.startswith("Room_"):
#         return room[5:]
#     return room


def encode_room_list(room_list):
    # rooms = [sanitize_room_code(room) for room in room_list]
    rooms = [room for room in room_list if len(room)]  # omit empty
    rooms.sort()
    rooms = " ".join(rooms)
    return rooms


# Email,Room
def insert_people_room_rows(rows):
    users_by_email = get_users_by_email()
    email_to_room_list = {}
    # gather rooms by person
    for row in rows:
        email, room = row
        email = email.lower()  # ensure emails are all lower case
        if email not in users_by_email:
            continue
        if email not in email_to_room_list:
            email_to_room_list[email] = []
        email_to_room_list[email].append(room)
    count = 0
    # loop over people adding rooms
    for email in email_to_room_list:
        person = users_by_email[email]
        room_list = email_to_room_list[email]
        rooms = encode_room_list(room_list)
        person.rooms = rooms
        db.session.add(person)
        count += 1
    return count


def areas_to_label_names(areas_string):
    areas = areas_string.split("/")
    labels = [area.strip() for area in areas]
    return labels


def review_str_to_float(s):
    s = s.strip()
    if len(s):
        return float(s)
    return 0


def insert_chair_score_rows(rows):
    count = 0
    for row in rows:
        # Submission ID,Sort Score,Status,Reviews
        sid, chair_score, status, reviews = row
        paper = Paper.query.filter_by(sid=sid).first()
        if not paper:
            continue
        # update paper
        chair_score = review_str_to_float(chair_score)
        paper.sort_score = chair_score
        paper.all_scores = reviews
        db.session.add(paper)
        # update paper history with new bbs entry
        context_bbs = context_str_to_enum("BBS")
        consensus_enum = status_str_to_enum(status)
        history = History(
            paper=paper, context_enum=context_bbs, status_enum=consensus_enum
        )
        db.session.add(history)
        count += 1
    return count


def sticky_context_maybe_below_bar(paper, bar, status_str):
    is_reject = status_str == "Reject"
    is_below_bar = paper.sort_score < bar
    context_plenary = context_str_to_enum("Plenary")
    context = context_str_to_enum("Sticky")  # default (most cases)
    auto_reject = current_app.config["HEPCAT_AUTO_REJECT"]
    if auto_reject and is_below_bar and is_reject:
        context = context_plenary  # Mark in Plenary instead of Sticky
    return context


# At the start of the meeting, initialize the grid from BBS.
# It works as follows:
#   1. Tabled papers: no action.
#   2. Below-bar reject: set to reject (plenary).
#   3. Everything else: set a sticky.
def init_grid_from_bbs():
    delete_non_bbs_history()  # just in case...
    bar = get_bar()
    papers = Paper.query.all()
    papers = list(papers)
    context_plenary = context_str_to_enum("Plenary")
    context_sticky = context_str_to_enum("Sticky")
    tabled = status_str_to_enum("Tabled")
    reject = status_str_to_enum("Reject")
    for paper in papers:
        bbs_history = get_latest_history(paper)
        if not bbs_history:
            continue  # should not happen if chair uploaded BBS
        bbs_status = bbs_history.status_enum
        if bbs_status == tabled:
            continue  # nothing needed for tabled papers
        if paper.sort_score < bar and bbs_status == reject:
            context = context_plenary  # Mark in plenary
        else:
            context = context_sticky  # File a sticky
        history = History(paper=paper, context_enum=context, status_enum=bbs_status)
        db.session.add(history)


# Submission ID,When,Context,Status
def insert_history_rows(rows):
    test_bar = current_app.config["HEPCAT_TEST_BAR"]
    if test_bar:
        set_bar(test_bar)
    if current_app.config["HEPCAT_TEST_AUTO_INIT"]:
        init_grid_from_bbs()
    bar = get_bar()
    count = 0
    max_count = current_app.config["HEPCAT_TEST_HISTORY"]
    for row in rows:
        sid, _, context, status = row
        if not context or context == "BBS":
            # No context if downloading paper with no history.
            # Also ignore BBS status since they are set by chair file.
            continue
        nid = sid_to_num(sid)
        # secs = int(secs) # Now ignoring time which was hack for debugging
        paper = Paper.query.filter_by(nid=nid).first()
        if not paper:
            continue
        # debug: then = now - timedelta(seconds=secs)
        status_enum = status_str_to_enum(status)
        if context == "Sticky":
            context_enum = sticky_context_maybe_below_bar(paper, bar, status)
        else:
            context_enum = context_str_to_enum(context)
        history = History(
            paper=paper,
            # when=then,
            context_enum=context_enum,
            status_enum=status_enum,
        )
        db.session.add(history)
        count += 1
        if count >= max_count:
            break
    return count


def insert_actions_rows(rows):
    count = 0
    max_count = current_app.config["HEPCAT_TEST_ACTIONS"]
    for row in rows:
        email, _, func_name, args_json = row  # ignore when
        args_json = single_quote_to_double(args_json)
        action = Action(func_name=func_name, args_json=args_json)
        if email:
            action.email = email
        db.session.add(action)
        count += 1
        if count >= max_count:
            break
    return count


csvHeaders = {
    "actions": "Email,When,Action,Args",
    "chair": "Submission ID,Sort Score,Status,Reviews",
    "clusters": "Submission ID,Cluster",
    "conflicts": "Submission ID,Email",
    "filters": "Name,GUI,Filter",
    "history": "Submission ID,When,Context,Status",
    "paper_rooms": "Submission ID,Room",
    "papers": "Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract",
    "people_rooms": "Email,Room",
    "users": "Email,First Name,Last Name,Role,Password",
}


csvInsertFunctions = {
    "chair": insert_chair_score_rows,
    "clusters": insert_cluster_rows,
    "conflicts": insert_conflict_rows,
    "history": insert_history_rows,
    "actions": insert_actions_rows,
    "paper_rooms": insert_paper_room_rows,
    "papers": insert_paper_rows,
    "people_rooms": insert_people_room_rows,
    "filters": insert_filter_rows,
    "users": insert_user_rows,
}


def update_file_upload_info(header_type, count):
    # first delete any old upload records of this type
    delete_prev_file_uploads(header_type)
    # next make new upload record
    upload = FileUpload(file=header_type, count=count)
    db.session.add(upload)


def cache_user_password_hashes():
    hashes = {}
    users = User.query.all()
    for user in users:
        email = user.email
        hash = user.password_hash
        hashes[email] = hash
    return hashes


def read_csv(filename):
    if not os.path.exists(filename):
        return None
    timer_start()
    header, rows = read_csv_rows(filename)
    header_type, n_cols = get_csv_type(header)
    if not header_type or header_type not in csvInsertFunctions:
        return None
    log_print(f"Reading csv of type {header_type}")
    rows = keep_rows_with_n_cols(rows, n_cols)
    is_users = header_type == "users"
    if is_users and not current_app.config["DISABLE_PASSWORD_CACHE"]:
        hash_cache = cache_user_password_hashes()
    else:
        hash_cache = None
    # first delete old database info
    timer_end(f"finished reading {header_type} csv", True)
    dump_users_papers_and_conflicts(f"Before deleting {header_type}")
    deletion_func = csvDeleteFunctions[header_type]
    deletion_func()
    dump_users_papers_and_conflicts(f"After deleting {header_type}")
    timer_end(f"finished delete {header_type} data", True)
    # next insert new rows
    if is_users:
        count = insert_user_rows(rows, hash_cache)
    else:
        insertion_func = csvInsertFunctions[header_type]
        count = insertion_func(rows)
    dump_users_papers_and_conflicts(f"After inserting {header_type}")
    timer_end(f"finished inserting {header_type} data")
    update_file_upload_info(header_type, count)
    return header_type


csvLinklings = "users,papers,conflicts,clusters,paper_rooms,people_rooms,chair"
csvLinklings = csvLinklings.split(",")


def pending_uploads(uploads):
    already = [upload.file for upload in uploads]
    pending = [file for file in csvLinklings if file not in already]
    return pending


def save_and_read_csv(data):
    tmp_file = "upload.csv"
    folder = get_or_make_upload_folder()
    tmp_path = os.path.join(folder, tmp_file)
    write_data_to_file(data, tmp_path)
    header_type = read_csv(tmp_path)
    if header_type:
        save_file = f"upload_{header_type}.csv"
        save_path = os.path.join(folder, save_file)
        os.rename(tmp_path, save_path)
    return header_type


def read_test_csv_files():
    folder = current_app.config["HEPCAT_TEST_UPLOAD"]
    include_history = current_app.config["HEPCAT_TEST_HISTORY"]
    include_actions = current_app.config["HEPCAT_TEST_ACTIONS"]
    csv_order = "users,papers,conflicts,clusters,paper_rooms,people_rooms,chair"
    csv_order = csv_order.split(",")
    if include_history:
        csv_order.append("history")
    if include_actions:
        csv_order.append("actions")
    for csv_type in csv_order:
        filename = csv_type + ".csv"
        fullpath = os.path.join(folder, filename)
        log_print(f"reading csv: {fullpath}")
        header_type = read_csv(fullpath)
        if not header_type:
            log_print(f"failed to read csv: {fullpath}")
        elif not try_sql_commit():
            log_print(f"failed sql commit: {csv_type}")
        elif header_type != csv_type:  # just a sanity check
            log_print(f"warning: csv type mismatch: {header_type} {csv_type}")
