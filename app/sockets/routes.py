import os
# import random
from datetime import datetime
from flask_socketio import emit, disconnect
from flask_login import current_user
# from sqlalchemy import true
from sqlalchemy.sql.expression import func
from .. import db, socketio, allow_cors
from ..models import User, Paper, UserSchema, PaperSchema, History, HistoryContext, \
    HistorySchema, GlobQueue, GlobQueueSchema, status_str_to_enum
from ..orderq import order_q, get_enter_leave_conf_sets

user_schema = UserSchema()
users_schema = UserSchema(many=True)
paper_schema = PaperSchema()
papers_schema = PaperSchema(many=True)
global_schema = GlobQueueSchema()
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
        now = datetime.now()
        seconds_since_epoch = now.timestamp()
        ten_seconds_since_epoch = int(seconds_since_epoch / 10.0)
        # formerly: if random.choice([False,True]):
        if ten_seconds_since_epoch % 2: # alternate every 10 seconds        
            user = User.query.first() # guaranteed Admin
        else:
            user = User.query.order_by(func.random()).first() # works for PostgreSQL, SQLite
        return user
    print('user is not logged in: forcing disconnect here.')
    disconnect()
    return None

def get_grid_dump_above_bar(above):
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

def get_grid_indices_and_above(above, below):
    above_indices = []
    grid_indices = {}
    for index,entry in enumerate(above):
        nid = entry['nid']
        grid_indices[nid] = index
        above_indices.append(nid)
    for index,entry in enumerate(below):
        nid = entry['nid']
        grid_indices[nid] = index
    return grid_indices, above_indices

def get_grid_dump():
    above = get_grid_dump_above_bar(True)
    below = get_grid_dump_above_bar(False)
    grid_indices, above_indices = get_grid_indices_and_above(above, below)
    grid_dump = { 'above': above, 'below': below, 
        'grid_indices':grid_indices, 'above_indices': above_indices}
    return grid_dump

def get_user_dump(user):
    user_dump = user_schema.dump(user)
    conflict_papers = list(user.conf_papers)
    conflict_ids = [p.nid for p in conflict_papers]
    user_dump['conflict_papers'] = conflict_ids
    return user_dump

def get_user_list_dump(users, sort=True):
    user_list = list(users) # in case it was a set
    if sort:
        # currently sorts on full name. later: last name???
        user_list = sorted(user_list, key=lambda u: u.full_name)
    list_dump = []
    for user in user_list:
        user_dump = user_schema.dump(user)
        list_dump.append(user_dump)
    return list_dump

def get_paper_conflicts_dump(paper):
    user_list = paper.conf_users
    conflict_dump = get_user_list_dump(user_list)
    return conflict_dump

def get_paper_history_dump(paper):
    context_plenary = int(HistoryContext.Plenary)
    plenary_history = History.query.filter_by(paper_id=paper.id) \
        .filter_by(context_enum=context_plenary).all()
    history_dump = history_schema.dump(plenary_history)
    return history_dump

def get_latest_history(paper):
    latest_history = History.query.filter_by(paper_id=paper.id) \
        .order_by(History.when.desc()).first()
    return latest_history

def get_latest_history_status(paper):
    latest = get_latest_history(paper)
    if latest:
        return latest.status
    return None

def is_paper_unseen(paper):
    context_bbs = int(HistoryContext.BBS)
    latest = get_latest_history(paper)
    if not latest or latest.context_enum == context_bbs:
        return True
    return False

def is_paper_stickie(paper):
    context_stickie = int(HistoryContext.Stickie)
    latest = get_latest_history(paper)
    if not latest or latest.context_enum != context_stickie:
        return False
    return True

def is_in_cluster(paper):
    for label in paper.tag_labels:
        if label.is_cluster:
            return True
    return False

# const filterList = ['Stickie Only','Untouched Only','No Clusters'];
def include_paper_in_queue(paper, filters):
    sort_score = paper.sort_score
    lowRange = float(filters['lowRange'])
    highRange = float(filters['highRange'])
    filter_statuses = filters['statuses']
    filter_only = filters['only']
    if sort_score < lowRange: ### ???? decide which is >=
        return False
    if sort_score > highRange:
        return False
    status = get_latest_history_status(paper)
    if status not in filter_statuses:
        return False
    if 'Stickie Only' in filter_only and not is_paper_stickie(paper):
        return False
    if 'Unseen Only' in filter_only and not is_paper_unseen(paper):
        return False
    if 'No Clusters' in filter_only and is_in_cluster(paper):
        return False
    return True 

def clear_queue():
    papers = Paper.query.all()
    for paper in papers:
        paper.queue_order = 0
        db.session.add(paper)
    db.session.commit()

def set_queue(filters):
    papers = Paper.query.all()
    p_list = list(papers)
    filter_papers = [p for p in p_list if include_paper_in_queue(p,filters)]
    order_papers = order_q(filter_papers)
    for paper in p_list:
        paper.queue_order = 0
    for index,paper in enumerate(order_papers):
        paper.queue_order = (index+1)
    for paper in p_list:
        db.session.add(paper)
    zero_or_inc_current_index(0) # does commit!

def show_current_paper():
    gq = GlobQueue.query.first()
    gq.current_show = True
    gq.current_start = func.now()
    db.session.add(gq)
    db.session.commit()

def hide_queue(hide, message):
    gq = GlobQueue.query.first()
    gq.hide_all = hide
    gq.message = message
    db.session.add(gq)
    db.session.commit()

def zero_or_inc_current_index(zero_or_inc):
    gq = GlobQueue.query.first()
    if zero_or_inc == 0:
        gq.current = 0
    else:
        gq.current += zero_or_inc
    gq.current_show = False
    db.session.add(gq)
    db.session.commit()

def update_current_paper_status(new_status):
    globs = get_globs_dump()
    current_index = globs['current']
    paper = get_paper_at_queue_index(current_index)
    context_plenary = int(HistoryContext.Plenary)
    status_enum = status_str_to_enum(new_status)
    history = History(paper=paper,
                    context_enum=context_plenary,
                    status_enum=status_enum)
    db.session.add(history) # commit will follow on setting current index
    return current_index, paper

def get_globs_dump():
    gq = GlobQueue.query.first()
    globs = global_schema.dump(gq)
    return globs

def get_paper_at_queue_index(index):
    if index < 0:
        return None
    add_one = index + 1
    paper = Paper.query.filter_by(queue_order=add_one).first()
    return paper

def get_globs_dump_with_status():
    globs = get_globs_dump()
    current_index = globs['current']
    paper = get_paper_at_queue_index(current_index)
    if paper:
        status = get_latest_history_status(paper)
        globs['current_status'] = status
        if globs['current_show']:
            history = get_paper_history_dump(paper)
            globs['current_history'] = history
    return globs

def get_queue():
    globs = get_globs_dump()
    current_index = globs['current']
    papers = Paper.query.filter(Paper.queue_order > 0) \
                    .order_by(Paper.queue_order).all()
    paper_list = []
    paper_prev = None
    for index,paper in enumerate(papers):
        # conflicts = get_paper_conflicts_dump(paper)
        _,conf_curr,enter,leave = get_enter_leave_conf_sets(paper_prev,paper)
        paper_dump = paper_schema.dump(paper)
        # paper_dump['history'] = history_dump
        if index <= current_index:
            paper_dump['status'] = get_latest_history_status(paper)
        paper_dump['conflicts'] = get_user_list_dump(conf_curr)
        paper_dump['enter'] = get_user_list_dump(enter)
        paper_dump['leave'] = get_user_list_dump(leave)
        paper_list.append(paper_dump)
        paper_prev = paper
    globs = get_globs_dump_with_status()
    queue = { 'paper_list': paper_list, 'globs': globs }
    return queue

@socketio.on('connect')
def io_connect():
    user = get_user_or_force_disconnect()
    if not user:
        return
    print(f'{user.full_name} - client connected')
    user_dump = get_user_dump(user)
    grid_dump = get_grid_dump()
    # config_vars = get_react_env_vars()
    # later: 'config': config_vars }
    data = {'user': user_dump, 'grid': grid_dump } 
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
    zero_or_inc_current_index(-1) # also "hides" current
    globs = get_globs_dump_with_status()
    emit('server_set_globs', globs)

@socketio.on('admin_next_paper')
def admin_next_paper(status_update):
    print('admin request for next paper with status:', status_update)
    before_index, paper = update_current_paper_status(status_update)
    zero_or_inc_current_index(+1) # also "hides" current
    # other things this should do:
    # - set color and sticky status on prev (for grid)
    globs = get_globs_dump_with_status()
    emit('server_set_globs', globs)
    # server_send_update
    # queue_index, grid_nid, status
    data = { 'queue_index':before_index, 'grid_nid':paper.nid, 'status':status_update }
    emit('server_send_update', data)

@socketio.on('admin_show_current')
def admin_show_current():
    print('admin request for show paper')
    show_current_paper()
    globs = get_globs_dump_with_status()
    emit('server_set_globs', globs)

@socketio.on('admin_hide_queue')
def admin_hide_queue(data):
    print(f'admin request for hide queue: {data.hide} {data.message}')
    hide_queue(data.hide, data.message)
    globs = get_globs_dump_with_status()
    emit('server_set_globs', globs)

@socketio.on('admin_set_queue')
def admin_set_queue(filters):
    print('admin request for set queue:', filters)
    set_queue(filters)
    queue = get_queue()
    emit('server_set_queue', queue)

@socketio.on('user_set_stickie')
def user_set_stickie(data):
    print('user request for set stickie:', data)

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