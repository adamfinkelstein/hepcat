import os
from flask_socketio import emit, disconnect
from flask_login import current_user
from sqlalchemy.sql.expression import func
from .. import socketio, allow_cors
from ..models import User, Paper, UserSchema, PaperSchema, History, HistoryContext, HistorySchema
from ..orderq import order_q

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

def get_user_or_disconnect():
    if current_user and not current_user.is_anonymous:
        return current_user
    if allow_cors: # hack to allow React to run in a different port without a login
        # user = User.query.first()
        user = User.query.order_by(func.random()) # for PostgreSQL, SQLite
        return user
    print('user is not logged in: forcing disconnect here.')
    disconnect()
    return None

def get_grid_dump():
    papers = Paper.query.all()
    # later: order them here
    grid_dump = []
    for paper in papers:
        history = list(paper.history)
        if len(history):
            status = history[-1].status # later fix this up!
        else:
            status = 'U'
        paper_dump = { 'nid': paper.nid, 'status': status }
        grid_dump.append(paper_dump)
    return grid_dump

def get_queue():
    start = 150
    end = 250
    papers = Paper.query.filter(Paper.nid >= start)\
                    .filter(Paper.nid <= end)\
                    .order_by(Paper.nid).all()
    paper_list = []
    plenary_context = int(HistoryContext.Plenary)
    for index,paper in enumerate(papers):
        paper_dump = paper_schema.dump(paper)
        paper_dump['queue_order'] = index+1
        conflicts = []
        for user in paper.conf_users:
            user_dump = user_schema.dump(user)
            conflicts.append(user_dump)
        pid = paper.id
        plenary_history = History.query.filter_by(paper_id=pid).filter_by(context_enum=plenary_context).all()
        history_dump = history_schema.dump(plenary_history)
        paper_dump['conflicts'] = conflicts
        paper_dump['history'] = history_dump
        paper_list.append(paper_dump)
    return paper_list

@socketio.on('connect')
def io_connect():
    user = get_user_or_disconnect()
    if not user:
        return
    print(f'{user.full_name} - client connected')
    user_dump = user_schema.dump(user)
    # config_vars = get_react_env_vars()
    grid_dump = get_grid_dump()
    data = { 'user': user_dump, 'grid': grid_dump } # 'config': config_vars }
    emit('welcome', data)
    data = get_queue()
    emit('queue', data)

@socketio.on('disconnect')
def io_disconnect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.full_name
    print(f'{user_name} - client disconnected')

@socketio.on('request_papers')
def io_request_papers(value):
    user_name = get_user_or_disconnect()
    if not user_name:
        return
    parts = value.split('-')
    start,end = (0,9999)
    if parts[0]:
        start = int(parts[0])
    if len(parts) > 1 and parts[1]:
        end = int(parts[1])
    papers = Paper.query.filter(Paper.nid >= start)\
                        .filter(Paper.nid <= end)\
                        .order_by(Paper.nid).all()
    ordered = order_q(papers)
    paper_list = []
    for paper in ordered:
        paper_dump = paper_schema.dump(paper)
        conflicts = []
        for user in paper.conf_users:
            user_dump = user_schema.dump(user)
            conflicts.append(user_dump)
        history_dump = history_schema.dump(paper.history)
        paper_dump['conflicts'] = conflicts
        paper_dump['history'] = history_dump
        paper_list.append(paper_dump)
    data = { 'papers': paper_list, 'requester': user_name }
    emit('papers', data, broadcast=True)

