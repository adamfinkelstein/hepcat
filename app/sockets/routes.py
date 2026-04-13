# Copyright (c) 2025-2026 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import json
from flask import current_app
from flask_socketio import (
    emit,
    join_room,
    leave_room,
    ConnectionRefusedError,
)
from .decorators import (
    admin_required_for_io_with_record,
    admin_required_for_io_no_record,
    login_required_for_io,
    super_required_for_io,
    check_for_db_backup,
    playback_recorded_actions,
    get_user_or_disconnect,
)
from .db_backup import (
    backup_db_now,
    backup_files_available,
    restore_from_backup_latest,
    restore_from_backup_file,
)
from .. import db, socketio, log_print
from ..uploads import remove_upload_folder
from ..uploads.insert import (
    save_and_read_csv,
    pending_uploads,
    read_test_csv_files,
    init_grid_from_bbs,
)
from .filters import get_grid_paper_dump, get_filtered_papers
from .git_info import get_git_info_from_repo
from .users import (
    user_connect,
    user_disconnect,
    forget_user_socket,
    disconnect_all_users,
    user_record_socket_and_session,
    get_user_id_from_session,
    get_current_user_or_none,
)
from ..util import (
    invalidate_cache_all,
)
from ..models.settings import (
    setting_float_set,
    setting_bool_get,
    setting_bool_set,
)
from ..models.history_util import (
    get_latest_history,
)
from ..models.tables import (
    User,
    Paper,
    FileUpload,
    History,
    Filter,
    status_str_to_enum,
    context_str_to_enum,
    get_all_rooms,
)
from ..models.schemas import uploads_schema
from ..models.helpers import (
    dump_users_papers_and_conflicts,
    try_sql_commit,
    ensure_supers,
)
from ..admin.downloads import write_file_for_download
from .get_or_set import (
    bulk_confirm_in_queue,
    disconnect_non_admin_users,
    encrypt_obj_with_oid,
    get_all_user_dict_dump,
    get_encrypted_grid_entry,
    get_globs_dump_with_status,
    get_grid_dump_cached,
    get_one_user_dump,
    get_paper_all_history_dump,
    get_probe_counts_msg,
    get_queue_dump_cached,
    get_unconflicted_paper_keys_cached,
    invalidate_grid_cache,
    invalidate_queue_cache,
    is_paper_accepted,
    probe_queue_by_text_filter,
    set_hide_queue,
    set_queue,
    set_queue_by_text_filter,
    show_current_paper,
    update_all_paper_bar_status,
    update_current_paper_status,
    wipe_db_and_disconnect_all,
    zero_or_inc_current_index,
)

###########
#
# Common functions that emit messages:
#
###########


def broadcast_admin_alert(title, body):
    data = {"title": title, "body": body, "admin_only": True}
    emit("server_send_alert", data, room="admin")


def emit_admin_data(*, broadcast):
    # uploads
    uploads = FileUpload.query.all()
    uploads_dump = uploads_schema.dump(uploads)
    pending = pending_uploads(uploads)
    uploads = {"uploads": uploads_dump, "pending": pending}
    # filters
    filters = Filter.query.all()
    gui_names = [filter.name for filter in filters if filter.is_gui]
    text_names = [filter.name for filter in filters if not filter.is_gui]
    gui_names.sort()
    text_names.sort()
    filters = {"gui": gui_names, "text": text_names}
    # general
    disable = setting_bool_get("disable_logins")
    git_info = get_git_info_from_repo()
    is_backup = current_app.config["DB_BACKUP_SERVER"]
    data = {
        "disable_logins": disable,
        "git_info": git_info,
        "uploads": uploads,
        "filters": filters,
        "is_backup_server": is_backup,
    }
    # now send
    if broadcast:
        emit("server_send_admin_data", data, room="admin")
    else:  # otherwise just to the client of this request
        emit("server_send_admin_data", data)


def login_user_and_send_welcome(user):
    log_print(f"client connected - send welcome to {user.full_name}")
    user_dump = get_one_user_dump(user)
    user_token = user.generate_token()  # remember on page refresh
    paper_keys = get_unconflicted_paper_keys_cached(user)
    all_rooms = get_all_rooms()
    grid = get_grid_dump_cached(False)
    queue = get_queue_dump_cached(user.room_name, False)
    show_logs = current_app.config["HEPCAT_SHOW_LOGS"]
    data = {
        "show_logs": show_logs,
        "user": user_dump,
        "token": user_token,
        "paper_keys": paper_keys,
        "all_rooms": all_rooms,
        "grid": grid,
        "queue": queue,
    }
    emit("server_welcome", data)
    if user.role_is_admin:
        emit_admin_data(broadcast=False)
        # Need dump of all users for this admin.
        # So might as well share the full list with all admins.
        all_users = get_all_user_dict_dump()
        emit("server_refresh_all_users", all_users, room="admin")
    else:
        # Tell all admins, just about this login.
        user_dump = get_one_user_dump(user)
        emit("server_refresh_user", user_dump, room="admin")


###########
#
# Socket handlers functions (decorated).
#
###########


@socketio.on_error()
def socketio_error_handler(exc):
    current_app.logger.exception("Socket.IO error occurred: %s", str(exc))
    current_app.logger.exception("... exception type: %s", type(exc).__name__)
    msg = "An unexpected server error has occurred. Please notify an administrator."
    data = {
        "message": msg,
        "type": "danger",
    }
    emit("server_send_flasher", data)


@socketio.on("connect")
def io_connect(auth):
    ensure_supers()  # Ensure that special (chair) admin exists at login
    user, msg = user_connect(auth)
    if not user:
        raise ConnectionRefusedError(msg)  # reject the connection
    if user.role_is_admin:
        join_room("admin")
    # valid user, accept the connection and send welcome
    if try_sql_commit():
        login_user_and_send_welcome(user)


@socketio.on("disconnect")
def io_disconnect(reason):
    log_print(f"io_disconnect with reason: {reason}")
    user = user_disconnect()
    if user:
        # tell all admins about this disconnect.
        user_dump = get_one_user_dump(user)
        emit("server_refresh_user", user_dump, room="admin")


##########
#
# User actions
#
##########


# needed to avoid race condition with user keys
@socketio.on("user_request_grid")
@get_user_or_disconnect
def user_request_grid(user):
    log_print(f"{user.full_name} requested grid")
    grid_dump = get_grid_dump_cached(False)
    emit("server_set_grid", grid_dump)


# always needed on room change
@socketio.on("user_request_queue")
@get_user_or_disconnect
def user_request_queue(user, room):
    user.room_name = room
    db.session.add(user)
    if try_sql_commit():
        log_print(f"{user.full_name} changed to {room}")
        data = get_queue_dump_cached(room, False)
        emit("server_set_queue", data)
        # tell all admins about this room change
        user_dump = get_one_user_dump(user)
        emit("server_refresh_user", user_dump, room="admin")
    else:
        msg = f"Sorry something went wrong choosing room {room}."
        reply = {"message": msg, "type": "warning"}
        emit("server_send_flasher", reply)


@socketio.on("user_set_sticky")
@login_required_for_io
@check_for_db_backup
def user_set_sticky(data):
    log_print(f"user request for set sticky: {data}")
    nid = data["nid"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    status_data = data["status"]
    key = data["key"]
    status = status_data
    if status == "Tabled-Discuss":
        status = "Tabled"
    is_reject = status == "Reject"
    playback = "playback" in data
    status_enum = status_str_to_enum(status)
    context_plenary = context_str_to_enum("Plenary")
    context_sticky = context_str_to_enum("Sticky")
    context = context_sticky  # default (most cases)
    if paper.below_bar and is_reject and not is_paper_accepted(paper):
        context = context_plenary  # Mark in Plenary instead of Sticky
    history = History(
        paper=paper, context_enum=context, status_enum=status_enum, sticky_key=key
    )
    db.session.add(history)
    if try_sql_commit():
        invalidate_grid_cache()
        data["idx"] = history.id  # same data but add id
        emit("server_confirm_sticky", data)  # just to sender
        grid_update = get_encrypted_grid_entry(paper)
        emit("server_set_sticky", grid_update, broadcast=True)
        if not playback:
            message = f"Sticky received for paper {nid} ({status_data})."
            data = {"message": message, "type": "success"}
            emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to file sticky for paper {nid} ({status_data})."
        log_print(msg)
        broadcast_admin_alert("Server Error", msg)


@socketio.on("user_revoke_sticky")
@login_required_for_io
def user_revoke_sticky(data):
    log_print(f"user request to revoke sticky: {data}")
    nid = data["nid"]
    key = data["key"]
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return  # should never happen because it is now checked at the client
    # should only be able to revoke sticky if most recent history
    latest = get_latest_history(paper)
    if not latest or latest.sticky_key != key:
        msg = f"Failed attempt to revoke sticky for paper {nid}."
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    print(f"latest before revoke: {latest}")
    context_revoke = context_str_to_enum("Revoke")
    latest.context_enum = context_revoke
    db.session.add(latest)
    print(f"latest after revoke: {latest}")
    if try_sql_commit():
        hist = get_paper_all_history_dump(paper)
        print(f"hist after revoke: {hist}")
        invalidate_grid_cache()
        grid_update = get_encrypted_grid_entry(paper)
        emit("server_set_sticky", grid_update, broadcast=True)
        playback = "playback" in data
        if not playback:
            message = f"Sticky revoked for paper {nid}!"
            data = {"message": message, "type": "success"}
            emit("server_send_flasher", data)
    else:
        msg = f"Failed attempt to revoke sticky for paper {nid} (db)."
        log_print(msg)
        broadcast_admin_alert("Server Error", msg)


@socketio.on("user_change_password")
@get_user_or_disconnect
def user_change_password(user, data):
    old_password = data["oldPassword"]
    new_password = data["password"]
    for_email = data["forEmail"]
    message = None
    if for_email:
        for_user = User.query.filter_by(email=for_email).first()
        if not user.role_is_admin or not for_user:
            success = False
        else:
            success = True
            for_name = for_user.full_name
            message = f"You have changed the password for {for_name}."
    else:
        if old_password and not user.verify_password(old_password):
            success = False
            message = "Current password incorrect. Password was NOT updated."
        else:
            success = True
            for_user = user  # self
            message = "You have successfully changed your password."
    if success:
        log_print(f"change password for {for_user.full_name}")
        for_user.password = new_password
        db.session.add(for_user)
        if try_sql_commit():
            message_type = "success"
        else:
            success = False
    if not success:
        if not message:
            message = "Error setting password."
        message_type = "warning"
    reply = {"message": message, "type": message_type}
    emit("server_send_flasher", reply)


##########
#
# Admin actions
#
##########


@socketio.on("admin_become_user")
@admin_required_for_io_no_record
def admin_become_user(email):
    old_user = get_current_user_or_none()
    new_user = User.query.filter_by(email=email).first()
    if not new_user:
        # this should never happen.
        # maybe rare race condition on old user list at client.
        msg = f"Failed attempt to switch to unknown user ({email})."
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    # forget socket under old user id
    old_user_id = get_user_id_from_session()
    forget_user_socket(old_user_id)
    # Is the new user an admin?
    # if NO:
    #   1. Need to leave admin room.
    #   2. Need to tell all admins about this logout.
    # if YES:  (no special actions needed)
    #   1. Already was in admin room - just stay.
    #   2. The "welcome" below will refresh user list for all.
    if not new_user.role_is_admin:
        leave_room("admin")
        # now that this socket is forgotten,
        # tell all admins, just about this one logout.
        user_dump = get_one_user_dump(old_user)
        emit("server_refresh_user", user_dump, room="admin")
    # record new user socket and session, then emit welcome
    user_record_socket_and_session(new_user)
    login_user_and_send_welcome(new_user)


@socketio.on("admin_prev_paper")
@admin_required_for_io_with_record
def admin_prev_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, -1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    data = get_globs_dump_with_status(room)
    emit("server_set_queue", data, broadcast=True)


@socketio.on("admin_next_paper")
@admin_required_for_io_with_record
def admin_next_paper(room):
    log_print(f"admin request for prev paper in {room}")
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_queue_cache(room)
    data = get_globs_dump_with_status(room)
    emit("server_set_queue", data, broadcast=True)


@socketio.on("admin_advance_queue")
@admin_required_for_io_with_record
@check_for_db_backup
def admin_advance_queue(data):
    room = data["roomChoice"]
    status_update = data["updateStatus"]
    log_print(f"admin request to advance queue in {room} with status {status_update}")
    index_before_advance, paper = update_current_paper_status(room, status_update)
    if not paper:
        msg = "Attempt to advance queue beyond end"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    zero_or_inc_current_index(room, +1)  # also "hides" current
    try_sql_commit()
    invalidate_grid_cache()
    invalidate_queue_cache(room)
    grid_paper_dump = get_grid_paper_dump(paper)
    update = {
        "room": room,
        "queue_index": index_before_advance,
        "nid": paper.nid,
        "status": status_update,
        "grid_update": grid_paper_dump,
    }
    update_encrypted = encrypt_obj_with_oid(update, paper.oid, paper.key)
    data = get_globs_dump_with_status(room)
    # globs['update'] = update # only send encrypted version!
    data["update_encrypted"] = update_encrypted
    emit("server_set_queue", data, broadcast=True)


@socketio.on("admin_show_current")
@admin_required_for_io_with_record
def admin_show_current(room):
    log_print(f"admin request for show paper in {room}")
    show_current_paper(room)
    try_sql_commit()
    invalidate_queue_cache(room)
    data = get_globs_dump_with_status(room)
    emit("server_set_queue", data, broadcast=True)


@socketio.on("admin_hide_queue")
@admin_required_for_io_with_record
def admin_hide_queue(data):
    room = data["roomChoice"]
    hide = data["hide"]
    message = data["message"]
    log_print(f"admin_hide_queue {room}: {hide} {message}")
    set_hide_queue(room, hide, message)
    try_sql_commit()
    invalidate_queue_cache(room)
    data = get_globs_dump_with_status(room)
    emit("server_set_queue", data, broadcast=True)
    if hide:
        reply = "Queue is now hidden for everyone except the admin."
    else:
        reply = "Queue is now visible for everyone."
    data = {"message": reply, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_queue_by_gui")
@admin_required_for_io_with_record
@check_for_db_backup
def admin_set_queue_by_gui(filters):
    room = filters["roomChoice"]
    log_print(f"admin request for set queue in {room}: {filters}")
    msg = set_queue(room, filters)
    try_sql_commit()
    queue = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_queue_by_text")
@admin_required_for_io_with_record
@check_for_db_backup
def admin_set_queue_by_text(data):
    room = data["roomChoice"]
    explicit = data["explicit"]
    no_tsp = data["noTSP"] if "noTSP" in data else False
    log_print(
        f"admin request for set explicit queue {room}: {explicit} (no tsp {no_tsp})"
    )
    msg = set_queue_by_text_filter(room, explicit, no_tsp)
    try_sql_commit()
    queue = get_queue_dump_cached(room, True)
    emit("server_set_queue", queue, broadcast=True)
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_save_filter")
@admin_required_for_io_with_record
def admin_save_filter(data):
    log_print(f"admin_save_filter: {data}")
    is_gui = "text" not in data
    if is_gui:
        text = json.dumps(data)
    else:
        text = data["text"]
    name = data["filterName"]
    filter = Filter.query.filter_by(name=name).first()
    if filter:  # if it exists... update:
        filter.text = text
        filter.is_gui = is_gui  # just in case
    else:  # otherwise... create:
        filter = Filter(name=name, is_gui=is_gui, text=text)
    db.session.add(filter)
    if try_sql_commit():
        emit_admin_data(broadcast=True)
        msg = f"Saved filter named: {name}."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)


@socketio.on("admin_load_filter")
@admin_required_for_io_no_record
def admin_load_filter(name):
    log_print(f"admin_load_filter: {name}")
    filter = Filter.query.filter_by(name=name).first()
    if filter:
        data = filter.text
        if filter.is_gui:
            data = json.loads(data)
        log_print(f"server_load_filter {data}")
        emit("server_load_filter", data)
    else:
        msg = f"Cannot find filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_delete_filter")
@admin_required_for_io_with_record
def admin_delete_filter(name):
    log_print(f"admin_delete_filter: {name}")
    filter = Filter.query.filter_by(name=name).first()
    if not filter:
        msg = f"Cannot find filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
        return
    num_deleted = Filter.query.filter_by(name=name).delete()
    log_print(f"delete {num_deleted} filters (should be 1).")
    if try_sql_commit():
        emit_admin_data(broadcast=True)
        msg = f"Deleted filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = f"Cannot delete filter with name: {name}"
        log_print(msg)
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


@socketio.on("admin_probe_by_gui")
@admin_required_for_io_no_record
def admin_probe_by_gui(filters):
    log_print(f"admin probe queue: {filters}")
    filter_papers = get_filtered_papers(filters)
    msg = get_probe_counts_msg(filter_papers)
    emit("server_probe_by_gui", msg)


@socketio.on("admin_probe_by_text")
@admin_required_for_io_no_record
def admin_probe_by_text(data):
    room = data["roomChoice"]
    explicit = data["explicit"].strip()
    log_print(f"admin request for probe explicit queue {room}: {explicit}")
    if explicit:
        msg = probe_queue_by_text_filter(room, explicit)
    else:
        msg = ""
    emit("server_probe_by_text", msg)


@socketio.on("admin_set_bar")
@admin_required_for_io_with_record
def admin_set_bar(bar):
    log_print(f"admin request set bar to {bar}")
    bar = float(bar)
    setting_float_set("bar", bar)
    update_all_paper_bar_status(bar)
    init_grid_from_bbs()
    try_sql_commit()
    grid_dump = get_grid_dump_cached(True)  # refresh cache
    emit("server_set_grid", grid_dump, broadcast=True)
    message = f"Bar is now updated to: {bar}"
    data = {"message": message, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_set_disable_logins")
@admin_required_for_io_no_record
def admin_set_disable_logins(disable):
    log_print(f"admin_set_disable_logins {disable}")
    setting_bool_set("disable_logins", disable)
    try_sql_commit()
    emit_admin_data(broadcast=True)
    if disable:
        disconnect_non_admin_users()


@socketio.on("admin_bulk_confirm")
@admin_required_for_io_with_record
def admin_bulk_confirm():
    msg = "got request for admin_bulk_confirm"
    log_print(msg)
    bulk_confirm_in_queue()
    success = try_sql_commit()
    # invalidate_grid_cache() # next line will do this
    grid_dump = get_grid_dump_cached(True)
    emit("server_set_grid", grid_dump, broadcast=True)
    if success:
        msg = "Completed bulk confirm in queue."
        data = {"message": msg, "type": "success"}
        emit("server_send_flasher", data)
    else:
        msg = "Error in admin_bulk_confirm."
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)


########
#
# Related to Uploads Page
#
########


@socketio.on("admin_file_upload")
@admin_required_for_io_no_record
def admin_upload_file(contents):
    invalidate_cache_all()  # just in case this changes some state
    header_type = save_and_read_csv(contents)
    if header_type and not try_sql_commit():
        header_type = None
    if not header_type:
        msg = "Unable to read the uploaded CSV. Perhaps the header is wrong?"
        data = {"message": msg, "type": "warning"}
        emit("server_send_flasher", data)
    if header_type == "users":
        disconnect_all_users()
        return  # logging out all users, so no need to send updates
    emit_admin_data(broadcast=True)
    if header_type == "filters":
        emit_admin_data(broadcast=True)
    if header_type in ["chair", "history"]:
        # reload will cause new globals and grid, which are needed
        emit("server_reload_user", broadcast=True)
    msg = dump_users_papers_and_conflicts("After Upload")
    msg = f"File upload ({header_type}) successful. {msg}"
    data = {"message": msg, "type": "success"}
    emit("server_send_flasher", data)


@socketio.on("admin_request_download")
@admin_required_for_io_no_record
def admin_request_download(kind):
    msg = f"Received admin_request_download {kind}"
    log_print(msg)
    filename, key = write_file_for_download(kind)
    data = {"filename": filename, "key": key}
    emit("server_send_download", data)


@socketio.on("admin_wipe_database")
@super_required_for_io
def admin_wipe_database():
    wipe_db_and_disconnect_all()
    remove_upload_folder()  # clean up any files


@socketio.on("admin_load_database")
@super_required_for_io
def admin_load_database():
    wipe_db_and_disconnect_all()
    read_test_csv_files()
    try_sql_commit()
    if current_app.config["HEPCAT_TEST_ACTIONS"]:
        playback_recorded_actions(user_set_sticky)


@socketio.on("admin_restore_database")
@super_required_for_io
def admin_restore_database():
    log_print("admin_restore_database")
    try:
        invalidate_cache_all()
        remove_upload_folder()  # clean up any files
        disconnect_all_users()  # do this first because users in db
        restore_from_backup_latest()
    except Exception as e:
        # We cannot issue warning or error through GUI because everyone
        # has been logged out by the "disconnect..." above.
        log_print(f"admin_restore_database: FAILED with {e}")
        raise


# mimics function above, but with filename specified
@socketio.on("admin_restore_database_from_file")
@super_required_for_io
def admin_restore_database_from_file(filename):
    log_print(f"admin_restore_database_from_file: {filename}")
    try:
        invalidate_cache_all()
        remove_upload_folder()
        disconnect_all_users()
        restore_from_backup_file(filename)
    except Exception as e:
        log_print(f"admin_restore_database_from_file: FAILED with {e}")
        raise


@socketio.on("admin_backup_now")
@admin_required_for_io_no_record
def admin_backup_now():
    time_string = backup_db_now()
    if time_string:
        msg = f"Backup completed {time_string}"
        variant = "success"
    else:
        msg = "Backup failed."
        variant = "danger"
    flash_data = {"message": msg, "type": variant, "duration": 8}
    emit("server_send_flasher", flash_data)


@socketio.on("admin_request_backup_list")
@admin_required_for_io_no_record
def admin_request_backup_list():
    files = backup_files_available()
    emit("server_send_backup_list", files)
