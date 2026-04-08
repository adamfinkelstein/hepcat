# Copyright (c) 2026 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

# db_backup.py

import os
import re
import shutil
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
# Internal - File Paths
#
##################################


def get_tmp_path():
    random_hex = os.urandom(8).hex()
    file_name = f"backup_tmp_{random_hex}.db"
    backup_dir = get_backup_dir()
    file_path = os.path.join(backup_dir, file_name)
    return file_path


def get_final_path():
    secs = int(time.time())
    final_name = f"backup_{secs}.db"
    backup_dir = get_backup_dir()
    final_path = os.path.join(backup_dir, final_name)
    return final_path


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
# This backup operation is atomic.
# Search for "backup(target" here:
#    https://docs.python.org/3/library/sqlite3.html
#
##################################


def copy_db_to_tmp(db_path, tmp_path):
    src = sqlite3.connect(db_path)
    dst = sqlite3.connect(tmp_path)
    src.backup(dst)
    dst.close()
    src.close()


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
    n_keep = current_app.config["DB_BACKUP_N_KEEP"]
    backups = list_backup_files()
    old_backups = backups[:-n_keep]
    backup_dir = get_backup_dir()
    for filename in old_backups:
        path = os.path.join(backup_dir, filename)
        delete_file(path)


##################################
#
# Internal - Copy and Verify Integrity
#
##################################


def copy_file_atomic(src_path, dst_path):
    staging_path = get_tmp_path()
    shutil.copyfile(src_path, staging_path)  # slow, not atomic
    os.replace(staging_path, dst_path)  # atomic


def verify_db_integrity(db_path):
    if not current_app.config["DB_BACKUP_VERIFY"]:
        return True
    conn = sqlite3.connect(db_path)
    try:
        result = conn.execute("PRAGMA integrity_check").fetchone()
        is_ok = result[0] == "ok"
        log_print(f"verify_db_integrity: {is_ok}")
        return is_ok
    finally:
        conn.close()


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
#   3. Prunes old backups, keeps only the most recent DB_BACKUP_N_KEEP.
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
        final_path = get_final_path()
        copy_file_atomic(db_path, final_path)
        if not verify_db_integrity(final_path):
            delete_file(final_path)
            return
        prune_old_backups()
        timer_end("finished db backup")
        launch_remote_sync()
    except Exception as e:
        log_print(f"db backup failed: {e}")


##################################
#
# Public / Exported
#
# Restore from latest backup.
#
##################################


def restore_from_latest_backup():
    most_recent = most_recent_backup_file()
    if most_recent is None:
        return
    backup_dir = get_backup_dir()
    backup_path = os.path.join(backup_dir, most_recent)
    # Maybe later, check db integrity using:
    #   if not verify_db_integrity(backup_path)
    # If it fails, we could delete the file and try again with the next.
    db_path = get_db_path()
    log_print(f"restoring db backup from {backup_path} to {db_path}")
    copy_file_atomic(backup_path, db_path)
    # We could consider adding this on production server:
    # -- kill gunicorn (and then supervisor will bring it back up)
    # import signal
    # os.kill(os.getpid(), signal.SIGHUP)
