from flask import request, session
from flask_socketio import call, disconnect
from app import db
from app.models import User

# global dictionary of clients
# key: user_id
# value: socketio session id (sid)
users = {}


def user_connect(auth):
    if "password" in auth:
        # this is a brand new login
        print(f'Received connection request from {auth.get("email")}')
        email_lower = auth.get("email", "").lower()
        user = User.query.filter_by(email=email_lower).first()
        if user is None or not user.verify_password(auth.get("password", "")):
            # invalid user or password, reject the connection
            return False
    elif "token" in auth:
        # this is a refresh login using a JWT token in place of a password
        user = User.user_from_token(auth.get("token", ""))
        if not user:
            return False
        print(f"Received refresh connection request from {user.email}")
    else:
        # this connection does not have sufficient credentials
        return False

    # store the user_id and sid in the global dictionary
    if user.id in users:
        # another logged in instance of this user exists, so we send an error
        # message and disconnect it
        print(
            f"User {user.email} is already connected, disconnecting previous instance"
        )
        call(
            "server_send_flasher",
            {
                "message": "This account logged in from another location",
                "type": "danger",
            },
            to=users[user.id],
            timeout=1,
        )
        disconnect(sid=users[user.id], namespace="/")
    users[user.id] = request.sid

    # store the user_id in the session
    session["user_id"] = user.id

    return user


def user_disconnect():
    user_name = "Unknown User"
    user = get_current_user_or_none()
    if user:
        user_name = user.full_name
    print(f"{user_name} - client disconnected")

    # remove the user_id and sid from the global dictionary
    user_id = session.get("user_id")
    if user_id in users:
        del users[user_id]

    # remove the user_id from the session
    session.pop("user_id", None)


def disconnect_all_users():
    for user_id in users.copy():
        if request.sid != users[user_id]:
            disconnect(sid=users[user_id], namespace="/")
    disconnect()  # disconnect the current user last


def get_current_user_or_none():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return db.session.get(User, user_id)


def user_is_connected(user_id):
    return user_id in users
