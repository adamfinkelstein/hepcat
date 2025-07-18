# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from .. import db, log_print
from ..models.tables import (
    Paper,
    History,
    Action,
    Label,
    FileUpload,
    Filter,
    Setting,
    context_str_to_enum,
)
from ..models.helpers import (
    drop_and_rebuild_tables,
    ensure_all_gqs,
    reset_all_gqs,
    set_all_users_to_be_in_plenary,
)


###############################################
#
# delete operations needed before uploads
#
###############################################

# does anything need to be done for settings?


def delete_all_users():
    # drop_and_rebuild_tables("conflicts,users,roles") # old version just this
    drop = "history,conflicts,tags,labels,papers,glob_queues,actions,users,roles"
    drop_and_rebuild_tables(drop)
    ensure_all_gqs()  # GQs were wiped, now needed


def delete_all_papers():
    set_all_users_to_be_in_plenary()
    drop_and_rebuild_tables("history,conflicts,tags,labels,papers,glob_queues,actions")
    ensure_all_gqs()  # GQs were wiped


def delete_all_conflicts():
    drop_and_rebuild_tables("conflicts")


def delete_all_clusters():
    papers = Paper.query.all()
    for paper in papers:
        # first remove all cluster labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_cluster]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    num_deleted = Label.query.filter(Label.is_cluster).delete()
    log_print(f"delete {num_deleted} cluster labels.")


# This function is never called to clean up, but could be.
# This function mimics delete_all_clusters above.
# (could use common code and pass the function label.is_room as arg. ???)
def delete_all_paper_rooms():
    delete_non_bbs_history()  # must delete room history because of room deletion
    papers = Paper.query.all()
    for paper in papers:
        # first remove all room labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_room]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    num_deleted = Label.query.filter(Label.is_room).delete()
    log_print(f"Deleted {num_deleted} cluster labels for paper rooms.")


def delete_all_labels():
    # first remove all labels from papers
    labels = Label.query.all()
    for label in labels:
        label.tag_papers = []  # empty list
        db.session.add(label)
    # next delete all labels
    num_deleted = Label.query.delete()
    log_print(f"Deleted {num_deleted} labels.")


# needed when deleting reviews (above)
def delete_all_history():
    num_deleted = History.query.delete()
    log_print(f"Deleted {num_deleted} history entries.")


# this is before history upload, which is just for debugging
def delete_non_bbs_history():
    context_bbs = context_str_to_enum("BBS")
    # Note that filter() allows for != (but filter_by does not allow it)
    num_deleted = History.query.filter(History.context_enum != context_bbs).delete()
    log_print(f"Deleted {num_deleted} history entries.")


def delete_actions():
    num_deleted = Action.query.delete()
    log_print(f"Deleted {num_deleted} actions.")


def papers_clear_all_scores():
    papers = Paper.query.all()
    for paper in papers:
        paper.sort_score = 0
        paper.all_scores = "This paper has no reviews."
        db.session.add(paper)


def papers_clear_all_queues():
    papers = Paper.query.all()
    for paper in papers:
        paper.queue_id = None
        paper.queue_order = 0
        db.session.add(paper)


def papers_clear_all_scores_and_queues():
    papers_clear_all_scores()
    papers_clear_all_queues()


def delete_all_chair_scores():
    delete_all_history()  # clears both bbs status and stickies
    papers_clear_all_scores_and_queues()
    reset_all_gqs()


def delete_all_uploads():
    num_deleted = FileUpload.query.delete()
    log_print(f"Deleted {num_deleted} file upload entries.")


def delete_all_filters():
    num_deleted = Filter.query.delete()
    log_print(f"Deleted {num_deleted} filters.")


def delete_all_settings():
    num_deleted = Setting.query.delete()
    log_print(f"Deleted {num_deleted} settings.")


csvDeleteFunctions = {
    "chair": delete_all_chair_scores,
    "clusters": delete_all_clusters,
    "conflicts": delete_all_conflicts,
    # "history": delete_non_bbs_history, # would remove auto-stickies
    "actions": delete_actions,
    "papers": delete_all_papers,
    "filters": delete_all_filters,
    "settings": delete_all_settings,
    "users": delete_all_users,
}

csvDependence = {
    "chair": ["history"],
    "papers": [
        "conflicts",
        "history",
        "clusters",
        "chair",
    ],
    "users": [
        "papers",
        "conflicts",
        "history",
        "clusters",
        "chair",
    ],
    # "users": ["conflicts"], # old version: users only wipe conflicts
}


def delete_prev_file_uploads(header_type):
    del_list = []
    if header_type in csvDependence:
        del_list = csvDependence[header_type]
        del_list = del_list.copy()  # work on temp copy
    del_list.append(header_type)
    for name in del_list:
        n_del = FileUpload.query.filter_by(file=name).delete()
        if n_del:
            log_print(f"Deleted {n_del} upload record(s) of type {name}")
