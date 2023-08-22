import os
import csv
import uuid
from flask import flash, current_app
from . import db
from .util import (
    run_cmd,
    get_latest_room_history_status,
    make_path_if_needed,
    write_data_to_file,
    write_text_to_file,
)
from .models import (
    User,
    Paper,
    History,
    LabelType,
    HistoryContext,
    Label,
    FileUpload,
    Query,
    sid_to_num,
    get_or_insert_role,
    dump_users_papers_and_conflicts,
    context_str_to_enum,
    status_str_to_enum,
    reset_all_gqs,
    try_sql_commit,
    ensure_all_gqs,
    drop_and_rebuild_tables,
)


def delete_all_users():
    dump_users_papers_and_conflicts("Before deleting users")
    users = User.query.all()
    count = len(users)
    # slightly lame optimization: prevents need to logout
    if count < 3:  # account for admin and chair
        return
    drop_and_rebuild_tables("conflicts,users,roles")
    # ensure_admin() causes warnings and not needed.
    dump_users_papers_and_conflicts("After deleting users")


def delete_all_papers():
    dump_users_papers_and_conflicts("Before deleting papers")
    drop_and_rebuild_tables("history,conflicts,tags,labels,papers,glob_queues")
    ensure_all_gqs()
    dump_users_papers_and_conflicts("After deleting papers")


def delete_all_conflicts():
    dump_users_papers_and_conflicts("Before deleting conflicts")
    drop_and_rebuild_tables("conflicts")
    dump_users_papers_and_conflicts("After deleting conflicts")


def delete_all_clusters():
    dump_users_papers_and_conflicts("Before deleting clusters")
    papers = Paper.query.all()
    for paper in papers:
        # first remove all cluster labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_cluster]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    num_deleted = Label.query.filter(Label.is_cluster).delete()
    print(f"delete {num_deleted} cluster labels.")
    if not try_sql_commit():
        msg = "failed in deleting clusters"
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts("After deleting clusters")


# this function mimics delete_all_clusters above
def delete_all_paper_rooms():
    dump_users_papers_and_conflicts("Before deleting paper rooms")
    papers = Paper.query.all()
    for paper in papers:
        # first remove all room labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_room]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    num_deleted = Label.query.filter(Label.is_room).delete()
    print(f"delete {num_deleted} cluster labels.")
    if not try_sql_commit():
        msg = "failed in deleting paper rooms"
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts("After deleting paper rooms")


# 2023?
def delete_all_labels():
    dump_users_papers_and_conflicts("Before label deletion")
    labels = Label.query.all()
    for label in labels:
        label.tag_papers = []  # empty list
        db.session.add(label)
    ok = try_sql_commit()
    if ok:
        num_deleted = Label.query.delete()
        print(f"deleted {num_deleted} labels")
        ok = try_sql_commit()
    if not ok:
        msg = "failed commit in delete_all_labels"
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts("After label deletion")


# needed when deleting reviews (above)
def delete_all_history():
    dump_users_papers_and_conflicts("Before History deletion")
    num_deleted = History.query.delete()
    print(f"Deleted {num_deleted} history entries.")
    if not try_sql_commit():
        msg = "failed commit in delete_all_history"
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts("After History deletion")


# 2023?
# this is before history upload, which is just for debugging
def delete_non_bbs_history():
    dump_users_papers_and_conflicts("Before non-BBS History deletion")
    context_bbs = int(HistoryContext.BBS)
    # Note that filter() allows for != (but filter_by does not allow it)
    num_deleted = History.query.filter(History.context_enum != context_bbs).delete()
    print(f"Deleted {num_deleted} history entries.")
    if not try_sql_commit():
        msg = "failed commit in delete_non_bbs_history"
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts("After non-BBS History deletion")


def delete_all_summaries():
    papers = Paper.query.all()
    count = len(papers)
    for paper in papers:
        paper.summary = ""
        db.session.add(paper)
    if not try_sql_commit():
        msg = "failed commit in delete_all_summaries"
        print(msg)
        flash(msg)
    print(f"Deleted {count} summaries.")


# 2023?
def delete_all_uploads():
    num_deleted = FileUpload.query.delete()
    if not try_sql_commit():
        msg = "failed commit in delete_all_uploads"
        print(msg)
        flash(msg)
    print(f"Deleted {num_deleted} file upload entries.")


def delete_all_queries():
    num_deleted = Query.query.delete()
    if not try_sql_commit():
        msg = "failed commit in delete_all_queries"
        print(msg)
        flash(msg)
    print(f"Deleted {num_deleted} queries.")


# Name,Query
def insert_query_rows(rows):
    delete_all_queries()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        name, json = row
        json_quote = json.replace("'", '"')  # replace single w double
        query = Query(name=name, json=json_quote)
        db.session.add(query)
        count += 1
    if not try_sql_commit():
        msg = "failed commit in insert query rows"
        print(msg)
        flash(msg)
        return 0
    return count


# Email,First Name,Last Name,Role,Password
def insert_user_rows(rows):
    delete_all_users()
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        email, first_name, last_name, role, password = row
        lower_email = email.lower()  # ensure emails are all lower case
        user = User(
            email=lower_email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            confirmed=True,
        )
        if len(role):
            roleObj = get_or_insert_role(role)
            user.role = roleObj
        db.session.add(user)
        count += 1
    if not try_sql_commit():
        msg = "failed commit when insert user rows (possible duplicate email?)"
        print(msg)
        flash(msg)
        return 0
    dump_users_papers_and_conflicts("After insertion")
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


# 2022: Submission ID,Thumbnail URL,Title,Area,Abstract
# 2023: Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract
def insert_paper_rows(rows):
    delete_all_papers()
    area_type = int(LabelType.Area)
    n = len(rows)
    oids = gen_unique_keys(n, 8)
    keys = gen_unique_keys(n, 16)
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
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
    if not try_sql_commit():
        msg = "failed commit when insert paper rows (possible duplicate paper id?)"
        print(msg)
        flash(msg)
        return 0
    return count


# Submission ID,Email
def insert_conflict_rows(rows):
    delete_all_conflicts()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid, email = row
        user = User.query.filter_by(email=email).first()
        paper = Paper.query.filter_by(sid=sid).first()
        if user and paper:
            user.conf_papers.append(paper)
            db.session.add(user)
            count += 1
    if not try_sql_commit():
        msg = "failed commit in insert conflict rows"
        print(msg)
        flash(msg)
        return 0
    return count


# Submission ID,Summary
def insert_summary_rows(rows):
    delete_all_summaries()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid, summary = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            paper.summary = summary
            db.session.add(paper)
            count += 1
    if not try_sql_commit():
        msg = "failed commit when insert summaries"
        print(msg)
        flash(msg)
        return 0
    return count


# Used for both Clusters and Rooms
def insert_label_rows(rows, label_type):
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid, label_name = row
        paper = Paper.query.filter_by(sid=sid).first()
        label = (
            Label.query.filter_by(type_enum=label_type)
            .filter_by(name=label_name)
            .first()
        )
        if not label:
            label = Label(type_enum=label_type, name=label_name)
            db.session.add(label)
        if label and paper:
            paper.tag_labels.append(label)
            db.session.add(paper)
            count += 1
    if not try_sql_commit():
        msg = f"failed commit when insert labels of type {label_type}"
        print(msg)
        flash(msg)
        return 0
    return count


# Submission ID,Cluster
def insert_cluster_rows(rows):
    delete_all_clusters()
    cluster_type = int(LabelType.Cluster)
    count = insert_label_rows(rows, cluster_type)
    return count


# Submission ID,Room
def insert_paper_room_rows(rows):
    delete_all_paper_rooms()
    room_type = int(LabelType.Room)
    count = insert_label_rows(rows, room_type)
    return count


# Email,Rooms
def insert_people_room_rows(rows):
    # first delete any existing room assignments...
    users = User.query.all()
    for person in users:
        person.rooms = None
        person.in_room = None
        db.session.add(person)
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        email, rooms = row
        email = email.lower()  # ensure emails are all lower case
        person = User.query.filter_by(email=email).first()
        if person and rooms:
            person.rooms = rooms
            db.session.add(person)
            count += 1
    if not try_sql_commit():
        msg = f"failed commit when insert people rooms"
        print(msg)
        flash(msg)
        return 0
    return count


def areas_to_label_names(areas_string):
    areas = areas_string.split("/")
    labels = [area.strip() for area in areas]
    return labels


#### do we need these three funcs ???


def float_str_to_int(s):
    return int(round(float(s)))


def review_str_to_float(s):
    s = s.strip()
    if len(s):
        return float(s)
    return 0


def review_str_to_int(s):
    f = review_str_to_float(s)
    i = int(round(f))
    return i


def papers_clear_all_scores_and_queues():
    papers = Paper.query.all()
    for paper in papers:
        paper.sort_score = 0
        paper.all_scores = "This paper has no reviews."
        paper.queue_id = None
        paper.queue_order = 0
        db.session.add(paper)


def insert_chair_score_rows(rows):
    delete_all_history()  # clears both bbs status and stickies
    papers_clear_all_scores_and_queues()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        # Submission ID,Sort Score,Status,Reviews
        sid, chair_score, status, reviews = row[:4]
        paper = Paper.query.filter_by(sid=sid).first()
        if not paper:
            continue
        # update paper
        chair_score = review_str_to_float(chair_score)
        paper.sort_score = chair_score
        paper.all_scores = reviews
        db.session.add(paper)
        # update paper history with new bbs entry
        context_enum = int(HistoryContext.BBS)
        consensus_enum = status_str_to_enum(status)
        history = History(
            paper=paper, context_enum=context_enum, status_enum=consensus_enum
        )
        db.session.add(history)
        count += 1
    if not try_sql_commit():
        msg = "failed commit in insert chair scores"
        print(msg)
        flash(msg)
        return 0
    reset_all_gqs()
    return count


# Submission ID,When,Context,Status
def insert_history_rows(rows):
    delete_non_bbs_history()  # delete history since BBS
    # now = datetime.now()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        sid, _, context, status = row
        if context == "BBS":  # these get set by status file
            continue
        nid = sid_to_num(sid)
        # secs = int(secs) # Now ignoring time which was hack for debugging
        paper = Paper.query.filter_by(nid=nid).first()
        if not paper:
            continue
        # debug: then = now - timedelta(seconds=secs)
        context_enum = context_str_to_enum(context)
        status_enum = status_str_to_enum(status)
        history = History(
            paper=paper,
            # when=then,
            context_enum=context_enum,
            status_enum=status_enum,
        )
        db.session.add(history)
        count += 1
    if not try_sql_commit():
        msg = "failed commit in insert history"
        print(msg)
        flash(msg)
        return 0
    return count


csvLinklings = {
    "users": "users.csv",
    "papers": "abstracts.csv",
    "conflicts": "conflicts.csv",
    "clusters": "clusters.csv",
    "paper_rooms": "paper_rooms.csv",
    "people_rooms": "people_rooms.csv",
    "chair_scores": "chair_scores.csv",
}

csvTypes = {
    "users": "Email,First Name,Last Name,Role,Password",
    "papers": "Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract",
    "conflicts": "Submission ID,Email",
    "clusters": "Submission ID,Cluster",
    "paper_rooms": "Submission ID,Room",
    "people_rooms": "Email,Rooms",
    "chair_scores": "Submission ID,Sort Score,Status,Reviews",
    "summaries": "Submission ID,Committee Notes",
    "queries": "Name,Query",
    "history": "Submission ID,When,Context,Status",
}

csvInsertFunctions = {
    "users": insert_user_rows,
    "papers": insert_paper_rows,
    "conflicts": insert_conflict_rows,
    "clusters": insert_cluster_rows,
    "paper_rooms": insert_paper_room_rows,
    "people_rooms": insert_people_room_rows,
    "chair_scores": insert_chair_score_rows,
    "summaries": insert_summary_rows,
    "queries": insert_query_rows,
    "history": insert_history_rows,
}

csvDependence = {
    "users": ["conflicts", "people_rooms"],
    "chair_scores": ["history"],
    "papers": [
        "conflicts",
        "history",
        "clusters",
        "paper_rooms",
        "summaries",
        "chair_scores",
    ],
}


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
    for typ in csvTypes:
        knownHeader = csvTypes[typ].lower()  # lower case
        if header.startswith(knownHeader):
            cols = knownHeader.split(",")
            ncols = len(cols)
            return typ, ncols
    return None, 0


def omit_extra_cols(rows, ncols):
    rows = [cols[:ncols] for cols in rows]
    return rows


def delete_prev_file_uploads(header_type):
    if header_type not in csvDependence:
        print("about to delete header_type: ", header_type)
        FileUpload.query.filter_by(file=header_type).delete()
        return
    del_list = csvDependence[header_type]
    del_list = list(del_list)
    del_list.append(header_type)
    for name in del_list:
        num_deleted = FileUpload.query.filter_by(file=name).delete()
        print(f"delete {num_deleted} file of types {name}")


def read_csv(filename):
    header, rows = read_csv_rows(filename)
    header_type, ncols = get_csv_type(header)
    if not header_type or header_type not in csvInsertFunctions:
        return False, False, ""
    rows = omit_extra_cols(rows, ncols)
    func = csvInsertFunctions[header_type]
    if not func:
        return False, False, ""  # this should never happen because of test above
    count = func(rows)
    if count < 0:
        return "already_sent_flash_msg", False, ""
    delete_prev_file_uploads(header_type)
    upload = FileUpload(file=header_type, count=count)
    db.session.add(upload)
    if not try_sql_commit():
        msg = "failed commit in add file upload record"
        print(msg)
    msg = dump_users_papers_and_conflicts("After Upload")
    if header_type == "users":
        msg += " You have been logged out because users were updated."
        return msg, True, header_type
    return msg, False, header_type


def pending_uploads(uploads):
    already = [upload.file for upload in uploads]
    keys = list(csvLinklings.keys())
    pending = [key for key in keys if key not in already]
    # print(already, keys, pending)
    return pending


def get_or_make_upload_folder():
    app = current_app._get_current_object()
    folder = app.config["UPLOAD_FOLDER"]
    make_path_if_needed(folder)
    return folder


def save_and_read_csv(data, filename):
    folder = get_or_make_upload_folder()
    fullpath = os.path.join(folder, filename)
    # file.save(fullpath) # when it was a file upload
    write_data_to_file(data, fullpath)
    # flash('saved csv file here: '+fullpath)
    msg, logout, header_type = read_csv(fullpath)
    return msg, logout, header_type


def get_paper_conflicts(paper):
    conflicts = paper.conf_users
    conflicts = [user.email for user in conflicts]
    return conflicts


def get_paper_room(paper):
    labels = paper.tag_labels
    paper_room = None
    for label in labels:
        if label.is_room:
            paper_room = label.name
    return paper_room


def get_paper_clusters(paper):
    labels = paper.tag_labels
    paper_clusters = []
    for label in labels:
        if label.is_cluster:
            paper_clusters.append(label.name)
    return paper_clusters


def get_paper_areas(paper):
    labels = paper.tag_labels
    paper_areas = []
    for label in labels:
        if label.is_area:
            paper_areas.append(label.name)
    return paper_areas


def get_paper_areas_string(paper):
    paper_areas = get_paper_areas(paper)
    paper_areas = "/".join(paper_areas)
    return paper_areas


def double_quote_text_for_csv(text):
    text = text.replace('"', '""')  # double up double quotes
    text = '"' + text + '"'
    return text


def paper_is_test(paper):
    return paper.nid >= 9999


def get_results_as_rows():
    papers = Paper.query.all()
    header = "Submission ID,Status"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        status = get_latest_room_history_status(p)
        row = f"{p.sid},{status}"
        rows.append(row)
    return rows


def get_queries_as_rows():
    queries = Query.query.all()
    header = "Name,Query"
    rows = [header]
    for query in queries:
        json_quote = query.json.replace('"', "'")  # replace double w single
        json_quote = double_quote_text_for_csv(json_quote)
        query_name = double_quote_text_for_csv(query.name)
        row = f"{query_name},{json_quote}"
        rows.append(row)
    return rows


def get_history_as_rows():
    history = History.query.order_by(History.when).all()
    header = "Submission ID,When,Context,Status"
    rows = [header]
    for h in history:
        when = str(h.when)
        when = double_quote_text_for_csv(when)
        row = f"{h.paper.sid},{when},{h.context},{h.status}"
        rows.append(row)
    return rows


def get_users_as_rows():
    users = User.query.order_by(User.role_id, User.full_name).all()
    header = "Email,First Name,Last Name,Role,Password"
    rows = [header]
    empty = ""
    for u in users:
        role = u.role_name
        if role == "Super" or role == "Screen":
            # these are created automatically
            continue
        row = f"{u.email},{u.first_name},{u.last_name},{role},{empty}"
        rows.append(row)
    return rows


def get_people_rooms_as_rows():
    users = User.query.order_by(User.email).all()
    header = "Email,Rooms"
    rows = [header]
    for u in users:
        rooms = u.rooms
        if rooms:
            row = f"{u.email},{rooms}"
            rows.append(row)
    return rows


def get_papers_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        dual = "no" if p.journal_only else "yes"
        areas = get_paper_areas_string(p)
        title = double_quote_text_for_csv(p.title)
        abstract = double_quote_text_for_csv(p.abstract)
        row = f"{p.sid},{p.thumbnail},{title},{areas},{dual},{abstract}"
        rows.append(row)
    return rows


def get_paper_rooms_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Room"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        room = get_paper_room(p)
        if room:
            row = f"{p.sid},{room}"
            rows.append(row)
    return rows


def get_chair_scores_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Sort Score,Status,Reviews"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        bbs = ""
        scores = p.all_scores
        if scores:
            bbs = scores.split()[-1]  # a little hacky
            scores = double_quote_text_for_csv(scores)
        row = f"{p.sid},{p.sort_score},{bbs},{scores}"
        rows.append(row)
    return rows


def get_clusters_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Cluster"
    rows = [header]
    for p in papers:
        clusters = get_paper_clusters(p)
        for c in clusters:
            row = f"{p.sid},{c}"
            rows.append(row)
    return rows


def get_conflicts_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Email"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        conflicts = get_paper_conflicts(p)
        for c in conflicts:
            row = f"{p.sid},{c}"
            rows.append(row)
    return rows


def write_csv_rows(rows, filename):
    text = "\n".join(rows)
    write_text_to_file(text, filename)


def write_csv_path(filename, rows):
    folder = get_or_make_upload_folder()
    fullpath = os.path.join(folder, filename)
    write_csv_rows(rows, fullpath)
    return fullpath


csvExtractFunctions = {
    "results": get_results_as_rows,
    "queries": get_queries_as_rows,
    "history": get_history_as_rows,
    "users": get_users_as_rows,
    "people_rooms": get_people_rooms_as_rows,
    "papers": get_papers_as_rows,
    "paper_rooms": get_paper_rooms_as_rows,
    "chair_scores": get_chair_scores_as_rows,
    "conflicts": get_conflicts_as_rows,
    "clusters": get_clusters_as_rows,
}


def write_kind_of_csv(kind):
    csv_kinds = csvExtractFunctions.keys()
    if kind not in csv_kinds:
        return None
    filename = f"hepcat_{kind}.csv"
    func = csvExtractFunctions[kind]
    rows = func()
    fullpath = write_csv_path(filename, rows)
    return fullpath


def write_all_csvs():
    csv_kinds = csvExtractFunctions.keys()
    paths = []
    for kind in csv_kinds:
        fullpath = write_kind_of_csv(kind)
        paths.append(fullpath)
    return paths


def write_zip_of_all_csvs():
    csv_paths = write_all_csvs()
    csv_paths = " ".join(csv_paths)
    folder = get_or_make_upload_folder()
    zipfile = "hepcat_data.zip"
    zipfile_path = os.path.join(folder, zipfile)
    # First remove the zip file if it exists (to avoid adding to it).
    if os.path.exists(zipfile_path):
        os.remove(zipfile_path)
    # The -j option avoids writing full paths into the zip file.
    cmd = f"/usr/bin/zip -j {zipfile_path} {csv_paths}"
    print(cmd)
    ok, output = run_cmd(cmd, False)
    if ok:
        print(f"zip claimed ok")
        return zipfile_path
    else:
        print(f"zip claimed error -- output:\n{output}")
        return None
