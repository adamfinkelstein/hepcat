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

@socketio.on('chat')
def chat(msg):
    user_name = 'Unknown User'
    if current_user:
        user_name = current_user.get_full_name()
    echo = f'{user_name} chats: {msg}'
    print(echo)
    emit('chat_echo', echo, broadcast=True)
