# Copyright (c) 2025-2026 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import json
from functools import wraps
from flask import current_app
from flask_socketio import disconnect
from .. import db, log_print
from ..models.tables import Action
from .db_backup import backup_db_if_needed
from .users import (
    current_user_is_admin,
    current_user_is_super,
    get_current_user_or_none,
)

##################################
#
# Recording Admin Actions
#
# Note: do not need to call try_sql_commit() either
# 1) when recording Action to db, or
# 2) during playback
# because (at least for now) all functions wrapped with
# @admin_required_for_io_with_record do so already.
#
##################################

recorded_functions = {}


def remember_function_by_name(f):
    func_name = f.__name__
    recorded_functions[func_name] = f


def playback_recorded_actions(handle_sticky_func):
    log_print("playback_recorded_actions")
    actions = Action.query.order_by(Action.id).all()
    if not actions:
        log_print("no actions to playback")
    for a in actions:
        email = a.email
        func_name = a.func_name
        args_json = a.args_json
        log_print(f"playback ({email}) {func_name}: {args_json}")
        if email == "Sticky":
            parts = func_name.split("_")
            nid = int(parts[1])
            status = args_json.replace('"', "")  # remove quotes
            playback = True
            data = {"nid": nid, "status": status, "playback": playback}
            log_print(f"playback sticky: {data}")
            handle_sticky_func(data)
            continue
        if func_name not in recorded_functions:
            log_print("error: could not find function named {func_name}")
            continue
        f = recorded_functions[func_name]
        args = json.loads(args_json)
        # log_print(f"{f}: {args}")
        f(*args)


def record_action(func_name, args_json):
    action = Action(func_name=func_name, args_json=args_json)
    user = get_current_user_or_none()
    if user:
        action.email = user.email
    db.session.add(action)
    # log_print("admin recorded:", func_name, args_json)


##################################
#
#  Wrappers for Admin Functions
#
##################################


# Require that the wrapped function is being requested by
# an Admin user. In this variant, the operation is recorded
# in the Actions table.
def admin_required_for_io_with_record(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            disconnect()
            return
        record_admin = current_app.config["HEPCAT_RECORD_ADMIN"]
        if record_admin:
            func_name = f.__name__
            args_json = json.dumps(args)
            record_action(func_name, args_json)
        return f(*args, **kwargs)

    remember_function_by_name(f)
    return decorated


# Require that the wrapped function is being requested by
# an Admin user. In this variant, the operation is not
# recorded in the Actions table.
def admin_required_for_io_no_record(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated


# Require that the wrapped function is being requested by
# an Super user. No Super functions are recorded.
def super_required_for_io(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_super():
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated


# Require that the wrapped function is being requested by
# a logged in user.
def login_required_for_io(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user_or_none()
        if not user:
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated


# Require that the wrapped function is being requested by
# a logged in user, and pass that user as a first arg to
# the wrapped function.
def get_user_or_disconnect(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user_or_none()
        if not user:
            disconnect()
            return
        # Call the original function with user as the first argument
        return f(user, *args, **kwargs)

    return decorated


##################################
#
# check_for_db_backup is a decorator that calls backup_db_if_needed()
# after the wrapped handler completes, so the database backup reflects
# the most recent write.
#
# It should be applied closest to the handler function, below any other
# decorators, so that it runs only if the handler actually executed
# (i.e. the user was authorized and the db write completed). Example:
#
#   @socketio.on("admin_next_paper")
#   @admin_required_for_io_with_record
#   @check_for_db_backup
#   def admin_next_paper(room):
#       ...
#
##################################


def check_for_db_backup(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        result = f(*args, **kwargs)
        backup_db_if_needed()
        return result

    return decorated
