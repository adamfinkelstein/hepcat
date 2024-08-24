from .. import current_app
from ..util import make_path_if_needed

###############################################
#
# a few helper functions for the this module
#
###############################################


def single_quote_to_double(text):
    text = text.replace("'", '"')
    return text


def double_quote_to_single(text):
    text = text.replace('"', "'")
    return text


def get_paper_room_name_or_none(paper):
    labels = paper.tag_labels
    for label in labels:
        if label.is_room:
            return label.name
    return None


def get_or_make_upload_folder():
    folder = current_app.config["UPLOAD_FOLDER"]
    make_path_if_needed(folder)
    return folder
