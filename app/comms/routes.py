from flask_socketio import emit
from flask_login import current_user
from .. import socketio
from ..models import User, Role

@socketio.on('connect')
def connect():
    user_name = 'Unknown User'
    if current_user:
        user_name = current_user.get_full_name()
    print(f'{user_name} - client connected')
    emit('welcome', user_name)

@socketio.on('disconnect')
def disconnect():
    user_name = 'Unknown User'
    if current_user:
        user_name = current_user.get_full_name()
    print(f'{user_name} - client disconnected')

@socketio.on('ping')
def ping(json):
    user_name = 'Unknown User'
    if current_user:
        user_name = current_user.get_full_name()
    msg = str(json)
    print(f'{user_name} - client ping: {msg}')