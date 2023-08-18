from functools import wraps
from flask import abort
from app.util import current_user_is_admin, current_user_is_super


def admin_required_for_route(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            return abort(404)
        return f(*args, **kwargs)

    return decorated


def super_required_for_route(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_super():
            return abort(404)
        return f(*args, **kwargs)

    return decorated
