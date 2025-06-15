# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import json
from .. import db, log_print
from .tables import Setting


######################
# Global settings
######################


def setting_var_set(name, value):
    val_type = type(value).__name__
    val_json = json.dumps(value)
    log_print(f"setting_set: {name}={value} type: {val_type} json: {val_json}")
    setting = Setting.query.filter_by(name=name).first()
    if setting:  # already exists, so replace
        setting.type = val_type
        setting.json = val_json
    else:
        setting = Setting(name=name, type=val_type, json=val_json)
    db.session.add(setting)


def setting_var_get(name):
    setting = Setting.query.filter_by(name=name).first()
    if setting:
        value = json.loads(setting.json)
        return value
    return None


def setting_float_set(name, val):
    val = float(val)
    setting_var_set(name, val)


def setting_float_get(name, default=0.0):
    val = setting_var_get(name)
    if val is None:
        return default
    return val


def setting_bool_set(name, val):
    val = bool(val)
    setting_var_set(name, val)


def setting_bool_get(name, default=False):
    val = setting_var_get(name)
    if val is None:
        return default
    return val
