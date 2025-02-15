# from .tables import db
from .helpers import setting_float_set, setting_float_get


def set_bar(bar):
    bar = float(bar)  # ensure it's a float
    setting_float_set("bar", bar)  # store in settings
    return bar  # return float


def get_bar():
    bar = setting_float_get("bar")
    if bar is not None:
        return bar
    bar = 0.0  # default value
    set_bar(bar)  # initialize
    return bar
