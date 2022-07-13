import os
import random
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

def get_user_or_force_disconnect():
    if current_user and not current_user.is_anonymous:
        return current_user
    if allow_cors: # hack to allow React to run in a different port without a login
        if random.choice([False,True]):
            user = User.query.first() # guaranteed Admin
        else:
            user = User.query.order_by(func.random()).first() # for PostgreSQL, SQLite
        return user
    print('user is not logged in: forcing disconnect here.')
    disconnect()
    return None

def get_grid_dump_bar(above):
    bar = 0.0
    if above:
        papers = Paper.query.filter(Paper.sort_score >= bar).order_by(Paper.sort_score.desc()).all()
    else:
        papers = Paper.query.filter(Paper.sort_score < bar).order_by(Paper.sort_score.desc()).all()
    # later: order them here
    papers_dump = []
    context_stickie = int(HistoryContext.Stickie)
    context_plenary = int(HistoryContext.Plenary)
    for paper in papers:
        status_full = 'Unseen'
        stickie = False
        history = list(paper.history)
        for h in history:
            if h.context_enum == context_stickie:
                stickie = True
            elif h.context_enum == context_plenary:
                stickie = False
                status_full = h.status
        status_short = status_full[:1] # first letter
        paper_dump = { 'nid': paper.nid, \
            'status': status_short, \
            'status_full': status_full, 'stickie': stickie }
        papers_dump.append(paper_dump)
    return papers_dump

def get_grid_dump():
    above = get_grid_dump_bar(True)
    below = get_grid_dump_bar(False)
    grid_dump = { 'above': above, 'below': below }
    return grid_dump

def get_paper_conflicts_dump(paper):
    conflicts = []
    for user in paper.conf_users:
        user_dump = user_schema.dump(user)
        conflicts.append(user_dump)
    return conflicts

def get_paper_history_dump(paper):
    context_plenary = int(HistoryContext.Plenary)
    plenary_history = History.query.filter_by(paper_id=paper.id) \
        .filter_by(context_enum=context_plenary).all()
    history_dump = history_schema.dump(plenary_history)
    return history_dump

# def get_paper_status_for_filter(paper):
#     context_plenary = int(HistoryContext.Plenary)
#     plenary_history = History.query.filter_by(paper_id=paper.id) \
#         .filter_by(context_enum=context_plenary).all()
#     history_dump = history_schema.dump(plenary_history)
#     return history_dump

def get_queue():
    start = 150
    end = 250
    papers = Paper.query.filter(Paper.nid >= start)\
                    .filter(Paper.nid <= end)\
                    .order_by(Paper.nid).all()
    paper_list = []
    for index,paper in enumerate(papers):
        paper_dump = paper_schema.dump(paper)
        conflicts = get_paper_conflicts_dump(paper)
        history_dump = get_paper_history_dump(paper)
        paper_dump['conflicts'] = conflicts
        paper_dump['history'] = history_dump
        paper_dump['queue_order'] = index+1
        paper_list.append(paper_dump)
    return paper_list

def include_paper_in_queue(paper, filters):
    if paper.nid < 150:
        return True
    return False

def set_queue(filters):
    papers = Paper.query.all()
    paper_list = []
    for index,paper in enumerate(papers):
        if include_paper_in_queue(paper, filters):
            conflicts = get_paper_conflicts_dump(paper)
            history_dump = get_paper_history_dump(paper)
            paper_dump = paper_schema.dump(paper)
            paper_dump['conflicts'] = conflicts
            paper_dump['history'] = history_dump
            paper_dump['queue_order'] = index+1
            paper_list.append(paper_dump)
    return paper_list

def get_user_dump(user):
    user_dump = user_schema.dump(user)
    conflict_papers = list(user.conf_papers)
    conflict_ids = [p.nid for p in conflict_papers]
    user_dump['conflict_papers'] = conflict_ids
    return user_dump

@socketio.on('connect')
def io_connect():
    user = get_user_or_force_disconnect()
    if not user:
        return
    print(f'{user.full_name} - client connected')
    user_dump = get_user_dump(user)
    grid_dump = get_grid_dump()
    # config_vars = get_react_env_vars()
    data = {'user': user_dump, 
            'grid': grid_dump } # later: 'config': config_vars }
    emit('server_welcome', data)
    data = get_queue()
    emit('server_set_queue', data)

@socketio.on('disconnect')
def io_disconnect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.full_name
    print(f'{user_name} - client disconnected')

@socketio.on('admin_prev_paper')
def admin_prev_paper():
    print('admin request for prev paper')

@socketio.on('admin_next_paper')
def admin_next_paper():
    print('admin request for next paper')

@socketio.on('admin_show_current')
def admin_show_current():
    print('admin request for show paper')

@socketio.on('admin_show_queue')
def admin_show_queue(data):
    print(f'admin request for show queue: {data.show} {data.message}')

@socketio.on('admin_set_queue')
def admin_set_queue(filters):
    print('admin request for set queue:', filters)
    queue = set_queue(filters)
    emit('server_set_queue', queue)

@socketio.on('user_set_stickie')
def user_set_stickie():
    print('user request for set stickie')

@socketio.on('user_change_password')
def user_change_password(new_password):
    user = get_user_or_force_disconnect()
    # security! later: disable printing pass:
    print(f'user {user.full_name} changes password to {new_password}')
    user.password = new_password

'''
* server_queue_hide (broadcast with message)
* server_set_queue
    * default current paper: the first in queue
    * can be just reply to admin 
    * broadcasted on "show queue"
* server_update_papers (from next button)
    * current paper (qid, nid, status for pulldown and hide)
    * prev paper (history, queue and grid status: color and clear sticky)
    * current status (for pulldown)
* server_update_stickie (QID and boolean)

Note:
* grid (and user) is sent with welcome

Later add:
* admin_queue_propbe
* server_queue_length (from probe)
'''