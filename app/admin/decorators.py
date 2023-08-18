from functools import wraps
from flask import redirect, url_for
from app.util import current_user_is_admin, current_user_is_super


def admin_required_for_route(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)

    return decorated


def super_required_for_route(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_super():
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)

    return decorated
