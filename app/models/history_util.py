# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from .tables import History, context_str_to_enum

######################
#
# EXPORTED FUNCTIONS on paper history.
#
# These four functions are related but distinct:
#
# * get_latest_history - considers all history for this paper.
# * get_latest_history_status - status from above.
#
# * get_latest_room_history - only history set in a meeting room.
# * get_latest_room_history_status - status from above.
#
######################


# partial query for paper history in order
def history_query_for_paper(paper):
    query = History.query.filter_by(paper_id=paper.id).order_by(History.id.desc())
    return query


# partial query for paper history in context (NOT greater)
def history_query_for_paper_in_context(paper, context_str):
    context_enum = context_str_to_enum(context_str)
    query = history_query_for_paper(paper)
    history = query.filter(History.context_enum == context_enum)
    return history


# partial query for paper history in context (OR greater)
def history_query_for_paper_above_context(paper, context_str):
    context_enum = context_str_to_enum(context_str)
    query = history_query_for_paper(paper)
    history = query.filter(History.context_enum >= context_enum)
    return history


# latest history above given context (e.g. "Plenary" for meeting room)
def get_latest_history_above_context(paper, context_str):
    query = history_query_for_paper_above_context(paper, context_str)
    latest_history = query.first()
    return latest_history


# latest history for this paper (not Revoke, but BBS etc)
def get_latest_history(paper):
    return get_latest_history_above_context(paper, "BBS")


# latest history set in a meeting room
def get_latest_room_history(paper):
    return get_latest_history_above_context(paper, "Plenary")


# status from any event (bbs, sticky, room)
def get_latest_history_status(paper):
    latest = get_latest_history(paper)
    if latest:
        return latest.status
    return None


# status from a meeting room only
def get_latest_room_history_status(paper):
    latest = get_latest_room_history(paper)
    if latest:
        return latest.status
    return None


def get_room_history_count(paper):
    query = history_query_for_paper_above_context(paper, "Plenary")
    n = query.count()
    return n


# Used for text filter like "BBS:Tabled" or "BBS:Reject".
# Also used in writing out chair file in zip.
# In principle, every paper should have a single BBS status.
def get_paper_bbs_status(paper):
    query = history_query_for_paper_in_context(paper, "BBS")
    latest_history = query.first()
    if latest_history:
        return latest_history.status
    return "Tabled"
