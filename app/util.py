import os
import random
from datetime import datetime
from flask_login import current_user
from sqlalchemy.sql import func
from .models import User, History, HistoryContext

allow_cors = os.getenv('ALLOW_CORS')


def get_random_admin():
    users = User.query.all()
    users = list(users)
    users = [user for user in users if user.role_is_admin]
    return random.choice(users)


def get_random_user():
    now = datetime.now()
    seconds_since_epoch = now.timestamp()
    ten_seconds_since_epoch = int(seconds_since_epoch / 10.0)
    if ten_seconds_since_epoch % 2:  # alternate every 10 seconds
        user = get_random_admin()
    else:
        user = User.query.order_by(
            func.random()
        ).first()  # works for PostgreSQL, SQLite
    return user


def get_current_user_or_none():
    if current_user and not current_user.is_anonymous:
        return current_user
    if allow_cors:  # hack to allow Rect debug on different port w/o login
        return get_random_user()
    print('user is not logged in: should force disconnect.')
    return None


def current_user_is_admin():
    if allow_cors:  # hack to allow Rect debug on different port w/o login
        return True
    user = get_current_user_or_none()
    if user and user.is_authenticated and user.role_is_admin:
        return True
    return False


def current_user_is_super():
    user = get_current_user_or_none()
    if user and user.is_authenticated and user.role_is_super:
        return True
    return False


######################
# The next four functions are related but distinct.
# * get_latest_history - considers all history for this paper
# * get_latest_room_history - only history set in a meeting room
# ... and then the next pair of function return the actual status
######################


# all history for this paper
def get_latest_history(paper):
    latest_history = (
        History.query.filter_by(paper_id=paper.id).order_by(History.when.desc()).first()
    )
    return latest_history


# only history set in a meeting room
def get_latest_room_history(paper):
    context_plenary = int(HistoryContext.Plenary)
    latest_history = (
        History.query.filter_by(paper_id=paper.id)
        .filter(History.context_enum >= context_plenary)
        .order_by(History.when.desc())
        .first()
    )
    return latest_history


# status from any event (bbs, stickie, room)
def get_latest_history_status(paper):
    latest = get_latest_history(paper)
    if latest:
        return latest.status
    return None


# status from a meeting room only
def get_latest_room_history_status(paper):
    latest = get_latest_room_history(paper)
    if latest:
        return latest.status
    return None
