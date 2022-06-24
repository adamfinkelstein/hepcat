from flask_socketio import emit
from flask_login import current_user
from .. import socketio
from ..models import User, Paper, PaperSchema

paper_schema = PaperSchema()
papers_schema = PaperSchema(many=True)

@socketio.on('connect')
def connect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    print(f'{user_name} - client connected')
    data = { 'user_name': user_name }
    emit('welcome', data)

@socketio.on('disconnect')
def disconnect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    print(f'{user_name} - client disconnected')

@socketio.on('chat')
def chat(data):
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    msg = data['message']
    echo = f'{user_name} chats: {msg}'
    print(echo)
    data['sender'] = user_name
    emit('chat_broadcast', data, broadcast=True)

@socketio.on('request_papers')
def request_papers():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    papers = Paper.query.limit(5).all()
    papers_dump = papers_schema.dump(papers)
    data = { 'papers': papers_dump, 'requester': user_name }
    emit('papers', data, broadcast=True)
