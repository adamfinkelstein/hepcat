# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import os
from .. import log_print
from ..util import (
    run_cmd,
    write_text_to_file,
)
from ..models.tables import (
    User,
    Paper,
    History,
    Action,
    FileUpload,
    Filter,
    Setting,
)
from ..models.history_util import get_latest_room_history, get_paper_bbs_status
from . import (
    double_quote_to_single,
    get_paper_room_name_or_none,
    get_or_make_upload_folder,
    file_is_upload,
)


###############################################
#
# writing CSV files below here
#
###############################################


def get_paper_conflicts(paper):
    conflicts = paper.conf_users
    conflicts = [user.email for user in conflicts]
    return conflicts


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


def get_paper_tags(paper):
    labels = paper.tag_labels
    paper_tags = []
    for label in labels:
        if label.is_tag:
            paper_tags.append(label.name)
    return paper_tags


def get_paper_areas_string(paper):
    paper_areas = get_paper_areas(paper)
    paper_areas = "/".join(paper_areas)
    return paper_areas


def get_paper_tags_string(paper):
    paper_tags = get_paper_tags(paper)
    paper_tags = " ".join(paper_tags)
    return paper_tags


# double all double quotes then add surrounding double quotes
def double_quote_text_for_csv(text):
    text = text.replace('"', '""')  # double up double quotes
    text = '"' + text + '"'  # add surrounding double quotes
    return text


def paper_is_test(paper):
    return paper.nid >= 9999


def datetime_to_quoted_str(when):
    time_fmt = "%Y/%m/%d %H:%M:%S UTC"
    when = when.strftime(time_fmt)
    when = double_quote_text_for_csv(when)
    return when


def get_results_as_rows():
    papers = Paper.query.all()
    header = "Submission ID,When,Context,Status"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        latest = get_latest_room_history(p)
        if latest:
            when = datetime_to_quoted_str(latest.when)
            context = latest.context
            status = latest.status
        else:
            when = ""
            context = ""
            status = "Unknown"
            # continue  # uncomment to omit such papers
        row = f"{p.sid},{when},{context},{status}"
        rows.append(row)
    return rows


def get_filters_as_rows():
    filters = Filter.query.all()
    header = "Name,GUI,Filter"
    rows = [header]
    for filter in filters:
        # in CSV, double quotes in JSON are replaced w single
        filter_name = double_quote_text_for_csv(filter.name)
        is_gui = "True" if filter.is_gui else "False"
        json_quote = double_quote_to_single(filter.text)
        json_quote = double_quote_text_for_csv(json_quote)
        row = f"{filter_name},{is_gui},{json_quote}"
        rows.append(row)
    return rows


def get_settings_as_rows():
    settings = Setting.query.all()
    header = "Name,Type,Value"
    rows = [header]
    for setting in settings:
        val_type = setting.type
        val_str = setting.json
        if val_type == "dict":
            # in CSV, double quotes in JSON are replaced w single
            val_str = double_quote_to_single(val_str)
        if val_type == "dict" or val_type == "str":
            val_str = double_quote_text_for_csv(val_str)
        elif val_type == "bool":
            val_str = "TRUE" if val_str.lower() == "true" else "FALSE"
        row = f"{setting.name},{setting.type},{val_str}"
        rows.append(row)
    return rows


def get_history_as_rows():
    history = History.query.order_by(History.id).all()
    header = "Submission ID,When,Context,Status"
    rows = [header]
    for h in history:
        when = datetime_to_quoted_str(h.when)
        row = f"{h.paper.sid},{when},{h.context},{h.status}"
        rows.append(row)
    return rows


def get_actions_as_rows():
    actions = Action.query.order_by(Action.id).all()
    header = "Email,When,Action,Args"
    rows = [header]
    for a in actions:
        email = a.email if a.email else ""
        when = datetime_to_quoted_str(a.when)
        args = double_quote_to_single(a.args_json)
        args = double_quote_text_for_csv(args)
        row = f"{email},{when},{a.func_name},{args}"
        rows.append(row)
    return rows


def make_tuple_array_from_rows(rows):
    tuple_array = []
    for row in rows:
        parts = row.split(",")
        when = parts[1]
        key = when + row
        tup = (key, row)
        tuple_array.append(tup)
    return tuple_array


def extract_stickies_from_history_as_actions(history_rows):
    # history: "Submission ID,When,Context,Status"
    # actions: "Email,When,Action,Args"
    stickies = []
    for row in history_rows:
        sid, when, context, status = row.split(",")
        if context == "Sticky":
            row = f"Sticky,{when},{sid},{status}"
            stickies.append(row)
    return stickies


def combine_rows_by_when(header, history, actions, starting):
    actions = actions + history
    actions.sort(key=lambda x: x[0])
    if starting:
        log_print(f"only include actions starting from {starting}")
        actions = [x for x in actions if x[0] >= starting]
    actions = [x[1] for x in actions]
    actions = [header] + actions
    return actions


def get_when_chair_file_was_uploaded():
    upload = FileUpload.query.filter_by(file="chair").first()
    if not upload:
        return None
    when = datetime_to_quoted_str(upload.when)
    return when


# AF2025-02-10: what is the purpose of this file type? Do we still need it?
# It might be to combine the history and actions into one file for testing.
# def get_combined_as_rows():
#     history = get_history_as_rows()
#     actions = get_actions_as_rows()
#     header = actions.pop(0)
#     history = extract_stickies_from_history_as_actions(history)
#     history = make_tuple_array_from_rows(history)
#     actions = make_tuple_array_from_rows(actions)
#     starting = get_when_chair_file_was_uploaded()
#     actions = combine_rows_by_when(header, history, actions, starting)
#     return actions


# Email,First Name,Last Name,Rooms,Role,Password
def get_users_as_rows():
    users = User.query.order_by(User.role_id, User.full_name).all()
    header = "Email,First Name,Last Name,Rooms,Role,Password"
    rows = [header]
    empty = ""
    auto_roles = "Super,Screen,Outside".split(",")
    for u in users:
        role = u.role_name
        if role in auto_roles:
            # these are created automatically
            continue
        rooms = u.rooms.replace(" ", ";")
        row = f"{u.email},{u.first_name},{u.last_name},{rooms},{role},{empty}"
        rows.append(row)
    return rows


# Submission ID,Exception,Thumbnail URL,Title,Area,Track,Room,Abstract
def get_papers_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Exception,Thumbnail URL,Title,Area,Track,Room,Abstract"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        track = "Journal Only Track" if p.journal_only else "Dual Track"
        area = get_paper_areas_string(p)
        title = double_quote_text_for_csv(p.title)
        abstract = double_quote_text_for_csv(p.abstract)
        room = get_paper_room_name_or_none(p)
        if room is None:
            room = ""
        part1 = f"{p.sid},{p.exception},{p.thumbnail},"
        part2 = f"{title},{area},{track},{room},{abstract}"
        row = part1 + part2
        rows.append(row)
    return rows


# Submission ID,Sort Score,Status,Reviews,Tags
def get_chair_scores_as_rows():
    papers = Paper.query.order_by(Paper.nid).all()
    header = "Submission ID,Sort Score,Status,Reviews,Tags"
    rows = [header]
    for p in papers:
        if paper_is_test(p):
            continue
        bbs = ""
        scores = p.all_scores
        if scores:
            bbs = get_paper_bbs_status(p)
            scores = double_quote_text_for_csv(scores)
        tags = get_paper_tags_string(p)
        row = f"{p.sid},{p.sort_score},{bbs},{scores},{tags}"
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


csvExtractFunctions = {
    "chair": get_chair_scores_as_rows,
    "clusters": get_clusters_as_rows,
    "conflicts": get_conflicts_as_rows,
    "settings": get_settings_as_rows,
    "history": get_history_as_rows,
    "papers": get_papers_as_rows,
    "filters": get_filters_as_rows,
    "users": get_users_as_rows,
    # "results" download is unlike any uploadable file above
    "results": get_results_as_rows,
    "actions": get_actions_as_rows,
    # "combined": get_combined_as_rows,
}


def write_kind_of_csv(kind):
    csv_kinds = csvExtractFunctions.keys()
    if kind not in csv_kinds:
        return None, None
    filename = f"hepcat_{kind}.csv"
    func = csvExtractFunctions[kind]
    rows = func()
    write_csv_path(filename, rows)
    return filename


def write_all_csvs():
    csv_kinds = csvExtractFunctions.keys()
    paths = []
    for kind in csv_kinds:
        filename = write_kind_of_csv(kind)
        if filename:
            paths.append(filename)
    return paths


def names_of_input_files(folder):
    dir = os.scandir(folder)
    names = [file.name for file in dir if file.is_file()]
    names = [name for name in names if file_is_upload(name)]
    names = " ".join(names)
    # print(names)
    return names


def write_zip_of_all_csvs():
    original_directory = os.getcwd()
    folder = get_or_make_upload_folder()
    os.chdir(folder)
    wrote_csv_files = write_all_csvs()
    wrote_csv_files = " ".join(wrote_csv_files)
    input_csvs = names_of_input_files(folder)
    csv_paths = wrote_csv_files + " " + input_csvs
    zipfile = "hepcat_data.zip"
    # First remove the zip file if it exists (to avoid adding to it).
    if os.path.exists(zipfile):
        os.remove(zipfile)
    # The -j option avoids writing full paths into the zip file.
    cmd = f"/usr/bin/zip -j {zipfile} {csv_paths}"
    log_print(cmd)
    ok, output = run_cmd(cmd, False)
    os.chdir(original_directory)
    if ok:
        log_print("zip claimed ok")
        return zipfile
    else:
        log_print(f"zip claimed error -- output:\n{output}")
        return None
