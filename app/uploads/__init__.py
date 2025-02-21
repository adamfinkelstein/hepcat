from .. import current_app
from ..util import make_path_if_needed, remove_folder_tree_if_exists

file_uploads_prefix = "uploaded_"

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


def remove_upload_folder():
    folder = current_app.config["UPLOAD_FOLDER"]
    remove_folder_tree_if_exists(folder)


def file_upload_name(header_type):
    return f"{file_uploads_prefix}{header_type}.csv"


def file_is_upload(file_name):
    return file_name.startswith(file_uploads_prefix) and file_name.endswith(".csv")
