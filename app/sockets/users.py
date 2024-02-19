from threading import Lock
from flask import request, session
from flask_socketio import call, disconnect
from app import db
from app.models import User


#####################
#
# USER SOCKET DICT
#
#####################


# global dictionary of clients
# key: user_id
# value: socketio session id (sid)
user_sockets = {}
debug_sockets_and_sessions = False
connection_lock = Lock()  # see comments in user_connect() function


def dprint(msg):
    if debug_sockets_and_sessions:
        print(msg)


def users_with_sockets():
    user_ids = user_sockets.keys()
    dprint(f"user_sockets: got {len(user_ids)} user ids")
    return user_ids


def user_has_socket(user_id):
    has_socket = user_id in user_sockets
    # this prints too often:
    # dprint(f"user_sockets: user {user_id} has socket: {has_socket}")
    return has_socket


def record_user_socket(user_id, sid):
    dprint(f"user_sockets: user {user_id} record socket: {sid}")
    user_sockets[user_id] = sid


def get_user_socket(user_id):
    if user_id in user_sockets:
        sid = user_sockets[user_id]
        print(f"user_sockets: user {user_id} get socket: {sid}")
        return sid
    dprint(f"user_sockets: user {user_id} does not have socket")
    return None


def forget_user_socket(user_id):
    dprint(f"user_sockets: forget socket for user {user_id}")
    if user_id in user_sockets:
        del user_sockets[user_id]


#######################
#
# USER SESSIONS
#
#######################


def put_user_id_in_session(user_id):
    dprint(f"session: user is now: {user_id}")
    session["user_id"] = user_id


def get_user_id_from_session():
    user_id = session.get("user_id")
    dprint(f"session: got user id: {user_id}")
    return user_id


def clear_user_id_in_session():
    dprint("session: clear user id")
    session.pop("user_id", None)


#####################
#
# CURRENT USER
#
#####################


def get_current_user_or_none():
    user_id = get_user_id_from_session()
    if not user_id:
        return None
    return db.session.get(User, user_id)


def current_user_is_admin():
    user = get_current_user_or_none()
    if user and user.role_is_admin:
        return True
    return False


def current_user_is_super():
    user = get_current_user_or_none()
    if user and user.role_is_super:
        return True
    return False


#####################
#
# USER CONNECT and DISCONNECT
#
#####################


def user_record_socket_and_session(user):
    record_user_socket(user.id, request.sid)
    put_user_id_in_session(user.id)


def user_disconnect_if_already_connected(user):
    if not user_has_socket(user.id):
        return  # no action needed
    # a logged in instance of this user is already connected.
    # send error message and disconnect them.
    print(f"User {user.email} already connected. Disconnect previous instance.")
    user_socket = get_user_socket(user.id)
    data = {
        "message": "This account logged in from another location",
        "type": "danger",
    }
    call("server_send_flasher", data, to=user_socket, timeout=1)
    disconnect(sid=user_socket, namespace="/")
    forget_user_socket(user.id)


def user_connect(auth):
    if "password" in auth:
        # this is a brand new login
        email = auth.get("email", "")
        password = auth.get("password", "")
        print(f"Received connection request from {email}")
        email_lower = email.lower()
        user = User.query.filter_by(email=email_lower).first()
        if user is None or not user.verify_password(password):
            # invalid user or password, reject the connection
            return False
    elif "token" in auth:
        # this is a refresh login using a JWT token in place of a password
        token = auth.get("token", "")
        user = User.user_from_token(token)
        if not user:
            return False
        print(f"Received refresh connection request from {user.email}")
    else:
        # this connection does not have sufficient credentials
        return False

    # The next two function calls make sure that there is only one instance of
    # a logged in user. If the user is already logged in, the previous instance
    # is disconnected. A process-wide connection lock is used to implement a
    # critical section that prevents race conditions, but note that this
    # solution is only effective for servers that implement concurrency with
    # threads or with gevent greenlets. This method of locking is insufficient
    # when multiple server processes exist. Unfortunately a lock across
    # multiple processes which can be potentially running on different hosts
    # or even data centers (as it would be the case on Heroku) is much harder
    # to implement and would require the use of a helper locking service to
    # which all the servers have access. One possibility is to use table or
    # row-level locks in Postgres for this purpose.
    with connection_lock:
        user_disconnect_if_already_connected(user)
        user_record_socket_and_session(user)
    return user


def user_disconnect():
    user_name = "Unknown User"
    user = get_current_user_or_none()
    if user:
        user_name = user.full_name
    print(f"{user_name} - client disconnected")

    # remove the user_id and sid from the global dictionary
    user_id = get_user_id_from_session()
    forget_user_socket(user_id)

    # remove the user_id from the session
    clear_user_id_in_session()


def disconnect_all_users():
    for user_id in users_with_sockets():
        user_sid = get_user_socket(user_id)
        if request.sid != user_sid:  # not current user
            disconnect(sid=user_sid, namespace="/")
    disconnect()  # disconnect the current user last
