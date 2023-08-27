from functools import wraps
from flask_socketio import disconnect
from .users import current_user_is_admin, current_user_is_super


def admin_required_for_io(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated


def super_required_for_io(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_super():
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated
