# Copyright (c) 2026 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

# db_backup.py

import os
import re
import sqlite3
import subprocess
import time
from flask import current_app
from .. import log_print
from ..util import timer_start, timer_end

##################################
#
# Internal - Configuration
#
##################################

BACKUP_FILENAME_RE = re.compile(r"^backup_(\d+)\.db$")


def get_db_path():
    # go from sqlite:///...etc.../data.sqlite to data.sqlite
    uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
    return uri.rsplit("/", 1)[-1]


def get_backup_dir():
    return current_app.config["DB_BACKUP_DIR"]


##################################
#
# Internal - Backup File Listing
#
##################################


def list_backup_files():
    backup_dir = get_backup_dir()
    try:
        os.makedirs(backup_dir, exist_ok=True)
        entries = os.listdir(backup_dir)
    except FileNotFoundError:
        return []
    matches = [name for name in entries if BACKUP_FILENAME_RE.match(name)]
    # Filenames sort alphabetically = chronologically (epoch timestamp prefix).
    return sorted(matches)


def most_recent_backup_file():
    backups = list_backup_files()
    return backups[-1] if backups else None


##################################
#
# Internal - Timing
#
##################################


def seconds_since_last_backup():
    most_recent = most_recent_backup_file()
    if most_recent is None:
        return float("inf")
    timestamp = int(BACKUP_FILENAME_RE.match(most_recent).group(1))
    return time.time() - timestamp  # float - int = float


# Says whether time since last backup is more than min interval between backups.
# Also verifies that backups should even run (eg on production server).
def backup_is_needed():
    if not current_app.config["DB_BACKUP_RUN"]:
        return False
    interval = current_app.config["DB_BACKUP_SECS"]
    duration = seconds_since_last_backup()
    is_needed = duration > interval
    return is_needed


##################################
#
# Internal - SQLite Copy
#
##################################


def make_tmp_path():
    backup_dir = get_backup_dir()
    random_hex = os.urandom(8).hex()
    return os.path.join(backup_dir, f"backup_tmp_{random_hex}.db")


def copy_db_to_tmp(db_path, tmp_path):
    src = sqlite3.connect(db_path)
    dst = sqlite3.connect(tmp_path)
    src.backup(dst)
    dst.close()
    src.close()


def get_final_name():
    secs = int(time.time())
    final_name = f"backup_{secs}.db"
    return final_name


def rename_tmp_to_final(tmp_path):
    backup_dir = get_backup_dir()
    final_name = get_final_name()
    final_path = os.path.join(backup_dir, final_name)
    os.replace(tmp_path, final_path)
    log_print(f"db_backup: wrote {final_name}")


##################################
#
# Internal - Pruning and Cleanup
#
##################################


def delete_file(path):
    try:
        os.remove(path)
    except OSError:  # no worries if it fails
        pass


def prune_old_backups():
    n_keep = current_app.config["DB_BACKUP_KEEP"]
    backups = list_backup_files()
    old_backups = backups[:-n_keep]
    backup_dir = get_backup_dir()
    for filename in old_backups:
        path = os.path.join(backup_dir, filename)
        delete_file(path)


##################################
#
# Internal - Sync local backup directory to remove backup server.
#
##################################


# rsync options:
# -rvz
#     r=Recursive, so it copies files in the directories.
#     v=Verbose.
#     z=Compress before sending, to reduce bandwidth.
# --ignore-existing
#     Skip files that already exist on the remote by name.
#     Safe here because each backup filename is unique by timestamp.
# --delete
#     Remove files on the remote that no longer exist locally.
#     So pruning is reflected on the remote side too.
def launch_remote_sync():
    backup_dir = get_backup_dir()
    local = backup_dir + "/"  # trailing slash: rsync copy dir CONTENTS
    remote = "ubuntu@backup.hepcat.app:hepcat/" + local
    cmd = ["rsync", "-rvz", "--ignore-existing", "--delete", local, remote]
    out = subprocess.DEVNULL
    subprocess.Popen(cmd, stdout=out, stderr=out)


##################################
#
# Public / Exported
#
# db_backup_if_needed() is called from the @check_db_backup decorator,
# which is applied to Flask request handlers that perform significant
# database writes. It runs entirely on the request thread except for
# the final rsync, which is launched as a background process.
#
# If enough time has passed since the last backup (determined by the
# timestamp in the most recent backup filename), it:
#   1. Copies the live SQLite database to a uniquely named tmp file,
#      using SQLite's online backup API (safe during concurrent writes).
#   2. Atomically renames the tmp file to its final backup name.
#   3. Prunes old backups, keeps only the most recent N (DB_BACKUP_KEEP).
#   4. Launches rsync as a background process to mirror the backup
#      directory to a remote server.
#
# Steps 1-3 should be quick, so they all happen during the request.
# Step 4 may be slow, so it is spawned in the background, allowing
# the request to complete quickly.
#
##################################


def db_backup_if_needed():
    if not backup_is_needed():
        return
    try:
        timer_start()
        log_print("starting db backup")
        db_path = get_db_path()
        tmp_path = make_tmp_path()
        copy_db_to_tmp(db_path, tmp_path)
        rename_tmp_to_final(tmp_path)
        prune_old_backups()
        timer_end("finished db backup")
        launch_remote_sync()
    except Exception as e:
        log_print(f"db backup failed: {e}")
        delete_file(tmp_path)
