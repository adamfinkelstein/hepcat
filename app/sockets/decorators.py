from functools import wraps
from flask_socketio import disconnect
from app.util import current_user_is_admin


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user_is_admin():
            disconnect()
            return
        return f(*args, **kwargs)

    return decorated
