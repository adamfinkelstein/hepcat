from flask_socketio import emit
from flask_login import current_user
from .. import socketio
from ..models import User, Paper, UserSchema, PaperSchema

user_schema = UserSchema()
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
def request_papers(value):
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.get_full_name()
    else:
        print('user is not logged in: should force disconnect here.')
    parts = value.split('-')
    start = int(parts[0])
    end = 10000
    if len(parts) > 1:
        end = int(parts[1])
    papers = Paper.query.filter(Paper.nid >= start)\
                        .filter(Paper.nid <= end)\
                        .order_by(Paper.nid).all()
    paper_list = []
    for paper in papers:
        paper_dump = paper_schema.dump(paper)
        conflicts = []
        for user in paper.conf_users:
            user_dump = user_schema.dump(user)
            conflicts.append(user_dump)
        paper_dump['conflicts'] = conflicts
        paper_list.append(paper_dump)
    data = { 'papers': paper_list, 'requester': user_name }
    emit('papers', data, broadcast=True)

