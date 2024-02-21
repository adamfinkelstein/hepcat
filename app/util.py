import os
from subprocess import run
from .models import History, HistoryContext


#######################
#
# Files and OS
#
#######################


def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)


def write_text_to_file(text, filename):
    with open(filename, "w") as f:
        f.write(text)


def write_data_to_file(data, filename):
    with open(filename, "wb") as f:
        f.write(data)


def read_text_from_file(filename):
    with open(filename, "r") as f:
        return f.read()


def read_lines_from_file(filename):
    with open(filename, "r") as f:
        return f.readlines()


# https://docs.python.org/3/library/subprocess.html#subprocess.run
# for unknown reasons, concorde returns code 255 (error) even when successful.
def run_cmd(cmd, ignore_errors=False):
    words = cmd.split()
    result = run(words, capture_output=True)
    if result.returncode and not ignore_errors:
        return False, f"run command error: {result}"
    return True, ""


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
    context_plenary = int(HistoryContext.Plenary)
    latest_history = (
        History.query.filter_by(paper_id=paper.id)
        .filter(History.context_enum >= context_plenary)
        .order_by(History.when.desc())
        .first()
    )
    return latest_history


# status from any event (bbs, stickie, room)
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
