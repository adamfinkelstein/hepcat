import os
import time
import shutil
from flask import current_app
from .. import log_print
from ..uploads import get_or_make_upload_folder, gen_random_key
from ..uploads.write_csv import write_kind_of_csv, write_zip_of_all_csvs


DOWNLOADS_FOLDER = "downloads"


def remove_old_key_dirs():
    max_age_secs = current_app.config["HEPCAT_MAX_DOWNLOAD_SECS"]
    original_directory = os.getcwd()
    folder = get_or_make_upload_folder()
    os.chdir(folder)
    current_time = time.time()
    for key in os.listdir(DOWNLOADS_FOLDER):
        path = os.path.join(DOWNLOADS_FOLDER, key)
        created = os.path.getctime(path)
        age_secs = int(current_time - created)
        if age_secs > max_age_secs:
            log_print(f"remove {path} because age is {age_secs} secs")
            shutil.rmtree(path)
    os.chdir(original_directory)  # just in case


def key_to_dir(key):
    path = os.path.join(DOWNLOADS_FOLDER, key)
    return path


def gen_unique_key():
    while True:
        key = gen_random_key(32)
        dir = key_to_dir(key)
        if not os.path.exists(dir):
            return key, dir


def gen_key_and_stash_file(filename):
    original_directory = os.getcwd()
    folder = get_or_make_upload_folder()
    os.chdir(folder)
    if not os.path.exists(filename):
        return None
    key, key_dir = gen_unique_key()
    os.makedirs(key_dir)
    fullpath = os.path.join(key_dir, filename)
    shutil.move(filename, fullpath)
    # os.remove(filename) # if instead we copied...
    os.chdir(original_directory)  # just in case
    return key


def write_file_for_download(kind):
    log_print(f"getting {kind} file...")
    if kind == "zip":
        filename = write_zip_of_all_csvs()
    else:
        filename = write_kind_of_csv(kind)
    key = gen_key_and_stash_file(filename)
    return filename, key


# It would be ideal to delete the file after sending.
# However, Flask's send_file() does not support callback
# on completion. As a workaround, after verifying that
# the file is ok (not too old) we MOVE it back up to
# the uploads folder and send it from there. This can
# only be done once, so a download key cannot be reused.
def verify_download_key(filename, key):
    remove_old_key_dirs()  # removes this or any other file if old
    folder = get_or_make_upload_folder()
    key_dir = key_to_dir(key)
    full_key_path = os.path.join(folder, key_dir, filename)
    final_path = os.path.join(folder, filename)
    if not os.path.exists(full_key_path):
        return None
    shutil.move(full_key_path, final_path)
    return final_path
