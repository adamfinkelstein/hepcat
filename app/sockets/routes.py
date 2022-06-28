import os
from flask_socketio import emit
from flask_login import current_user
from .. import socketio
from ..models import User, Paper, UserSchema, PaperSchema, HistorySchema

user_schema = UserSchema()
paper_schema = PaperSchema()
papers_schema = PaperSchema(many=True)
history_schema = HistorySchema(many=True)

def get_react_env_vars():
    vars = {}
    for item, value in os.environ.items():
        if item.startswith('REACT_APP'):
            vars[item] = value
    return vars

@socketio.on('connect')
def connect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    print(f'{user_name} - client connected')
    config_vars = get_react_env_vars()
    data = { 'user_name': user_name, 'config': config_vars }
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
def request_papers(value):
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    parts = value.split('-')
    start,end = (0,9999)
    if parts[0]:
        start = int(parts[0])
    if len(parts) > 1 and parts[1]:
        end = int(parts[1])
    papers = Paper.query.filter(Paper.nid >= start)\
                        .filter(Paper.nid <= end)\
                        .order_by(Paper.nid).all()
    paper_list = []
    for paper in papers:
        paper_dump = paper_schema.dump(paper)
        conflicts = []
        history = []
        for user in paper.conf_users:
            user_dump = user_schema.dump(user)
            conflicts.append(user_dump)
        history_dump = history_schema.dump(paper.history)
        paper_dump['conflicts'] = conflicts
        paper_dump['history'] = history_dump
        paper_list.append(paper_dump)
    data = { 'papers': paper_list, 'requester': user_name }
    emit('papers', data, broadcast=True)

