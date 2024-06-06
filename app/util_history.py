from .models import History, context_str_to_enum


######################
# The next four functions are related but distinct.
# * get_latest_history - considers all history for this paper
# * get_latest_room_history - only history set in a meeting room
# ... and then the next pair of function return the actual status
######################


# all history for this paper
def get_latest_history(paper):
    latest_history = (
        History.query.filter_by(paper_id=paper.id).order_by(History.when.desc()).first()
    )
    return latest_history


# only history set in a meeting room
def get_latest_room_history(paper):
    context_plenary = context_str_to_enum("Plenary")
    latest_history = (
        History.query.filter_by(paper_id=paper.id)
        .filter(History.context_enum >= context_plenary)
        .order_by(History.when.desc())
        .first()
    )
    return latest_history


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
