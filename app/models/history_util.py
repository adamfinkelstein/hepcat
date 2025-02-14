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


# all history for this paper
def get_latest_history(paper):
    latest_history = (
        History.query.filter_by(paper_id=paper.id).order_by(History.id.desc()).first()
    )
    return latest_history


# only history set in a meeting room
def get_latest_room_history(paper):
    context_plenary = context_str_to_enum("Plenary")
    latest_history = (
        History.query.filter_by(paper_id=paper.id)
        .filter(History.context_enum >= context_plenary)
        .order_by(History.id.desc())
        .first()
    )
    return latest_history


# only history set in bbs or meeting room???
# Maybe only need to check if paper is reject or tabled?
# def get_latest_bbs_or_room_history(paper):
#     context_plenary = context_str_to_enum("Plenary")
#     latest_history = (
#         History.query.filter_by(paper_id=paper.id)
#         .filter(History.context_enum >= context_plenary)
#         .order_by(History.id.desc())
#         .first()
#     )
#     return latest_history


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
