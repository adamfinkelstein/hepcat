import os
import re
from datetime import datetime
from flask_socketio import Namespace, emit, disconnect
from flask_login import current_user
from sqlalchemy.sql.expression import func
from .. import db, socketio, allow_cors
from ..models import User, Paper, Label, UserSchema, PaperSchema, History, HistoryContext, \
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

def get_current_user_or_none():
    if current_user and not current_user.is_anonymous:
        return current_user
    if allow_cors: # hack to allow Rect debug on different port w/o login
        now = datetime.now()
        seconds_since_epoch = now.timestamp()
        ten_seconds_since_epoch = int(seconds_since_epoch / 10.0)
        # formerly: if random.choice([False,True]):
        if ten_seconds_since_epoch % 2: # alternate every 10 seconds        
            user = User.query.first() # guaranteed Admin
        else:
            user = User.query.order_by(func.random()).first() # works for PostgreSQL, SQLite
        return user
    print('user is not logged in: should force disconnect.')
    return None

def current_user_is_admin():
    if allow_cors: # hack to allow Rect debug on different port w/o login
        return True
    user = get_current_user_or_none()
    if user and user.is_admin:
        return True
    return False

def get_grid_dump_above_bar(above):
    gq = GlobQueue.query.first()
    bar = gq.bar
    if above:
        papers = Paper.query.filter(Paper.sort_score >= bar).order_by(Paper.sort_score.desc()).all()
    else:
        papers = Paper.query.filter(Paper.sort_score < bar).order_by(Paper.sort_score.desc()).all()
    # later: order them here
    papers_dump = []
    context_stickie = int(HistoryContext.Stickie)
    context_plenary = int(HistoryContext.Plenary)
    for paper in papers:
        status = 'Unseen'
        stickie = False
        history = list(paper.history)
        for h in history:
            if h.context_enum == context_stickie:
                stickie = True
            elif h.context_enum == context_plenary:
                stickie = False
                status = h.status
        paper_dump = { 'nid': paper.nid, \
            'status': status, \
            'stickie': stickie }
        papers_dump.append(paper_dump)
    return papers_dump

def get_grid_nids(above):
    nids = [entry['nid'] for entry in above]
    return nids

def get_grid_dump():
    above = get_grid_dump_above_bar(True)
    below = get_grid_dump_above_bar(False)
    above_nids = get_grid_nids(above)
    below_nids = get_grid_nids(below)
    grid_dump = { 
        'above': above, 
        'below': below, 
        'above_nids': above_nids, 
        'below_nids': below_nids}
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
    # later see if we can use users schema for this...???
    list_dump = []
    for user in user_list:
        user_dump = user_schema.dump(user)
        list_dump.append(user_dump)
    return list_dump

def get_user_list_emails(users):
    user_list = list(users) # in case it was a set
    emails = []
    for user in user_list:
        emails.append(user.email)
    return emails

def get_all_user_list_dump():
    users = User.query.all()
    dump = get_user_list_dump(users)
    return dump

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

def has_chair_conflict(paper):
    conf_users = paper.conf_users
    for user in conf_users:
        if user.is_admin:
            return True
    return False

# const filterList = ['Stickie Only','Untouched Only',
#     'No Clusters','No Admin Conf'];
def include_paper_in_queue(paper, filters):
    sort_score = paper.sort_score
    lowRange = float(filters['lowRange'])
    highRange = float(filters['highRange'])
    filter_statuses = filters['statuses']
    filter_only = filters['only']
    # interface: true(low <= score)  <==>  test here: false(score < low)
    # interface: true(score < high)  <==>  test here: false(score >= high)
    if sort_score < lowRange:
        return False
    if sort_score >= highRange:
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
    if 'No Admin Conf' in filter_only and has_chair_conflict(paper):
        return False
    if 'Only Admin Conf' in filter_only and not has_chair_conflict(paper):
        return False
    return True 

def paper_is_unseen_reject_below_bar(paper):
    gq = GlobQueue.query.first()
    bar = gq.bar
    sort_score = paper.sort_score
    if sort_score >= bar:
        return False
    if not is_paper_unseen(paper):
        return False
    status = get_latest_history_status(paper)
    if status != 'Reject':
        return False
    return True 

def get_all_unseen_reject_below_bar_papers():
    papers = Paper.query.all()
    list_papers = list(papers)
    filter_papers = [p for p in list_papers if paper_is_unseen_reject_below_bar(p)]
    return filter_papers

def bulk_reject_below_bar():
    papers = get_all_unseen_reject_below_bar_papers()
    context_plenary = int(HistoryContext.Plenary)
    status_enum = status_str_to_enum('Reject')
    for paper in papers:
        history = History(paper=paper,
                    context_enum=context_plenary,
                    status_enum=status_enum)
        db.session.add(history)
    try:
        db.session.commit()
        return True
    except:
        db.session.rollback()
        msg = 'failed to bulk_reject_below_bar'
        print(msg)
        broadcast_admin_alert('Server Error',msg)
        return False

def clear_queue():
    papers = Paper.query.all()
    for paper in papers:
        paper.queue_order = 0
        db.session.add(paper)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to clear queue'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

def zero_or_inc_current_index(zero_or_inc):
    gq = GlobQueue.query.first()
    gq.current_show_enter = zero_or_inc
    if zero_or_inc == 0:
        gq.current = 0
    elif zero_or_inc == -1:
        gq.current -= 1
    elif zero_or_inc == +1:
        gq.current += 1
    else:
        gq.current = -1 # default = no current 
        gq.current_show_enter = 0
    gq.current_show = False
    db.session.add(gq)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = f'failed to set queue index (inc {zero_or_inc})'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

def set_bar(bar):
    bar = float(bar)
    gq = GlobQueue.query.first()
    gq.bar = bar
    db.session.add(gq)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to set bar'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

def set_queue_to_paper_list(all_papers, paper_list, solve_tsp):
    if solve_tsp:
        order_papers = order_q(paper_list)
    else:
        order_papers = paper_list
    for paper in all_papers:
        paper.queue_order = 0
    for index,paper in enumerate(order_papers):
        paper.queue_order = (index+1)
    for paper in all_papers:
        db.session.add(paper)
    if len(paper_list):
        zero_or_inc_current_index(0) # does commit!
    else:
        zero_or_inc_current_index(-100) # empty queue = no current 

def get_all_and_filter_papers(filters):
    papers = Paper.query.all()
    list_papers = list(papers)
    filter_papers = [p for p in list_papers if include_paper_in_queue(p,filters)]
    return list_papers, filter_papers

def set_queue(filters):
    all_papers, filter_papers = get_all_and_filter_papers(filters)
    solve_tsp = True
    set_queue_to_paper_list(all_papers, filter_papers, solve_tsp)

def get_filter_paper_count(filters):
    _, filter_papers = get_all_and_filter_papers(filters)
    return len(filter_papers)

def parse_explicit_queue(exp):
    exp = exp.strip()
    if not exp or exp == '_CLEAR_':
        return None, []
    remove_papers_spaces = exp
    remove_strings = ['papers_','paper_',' ']
    for str in remove_strings:
        remove_papers_spaces = remove_papers_spaces.replace(str,'')
    nums_only = re.sub('[^0-9]', "", remove_papers_spaces)
    no_nums = re.sub('[0-9,]', "", remove_papers_spaces)
    if len(nums_only) < len(no_nums):
        # more alpha characters so assume cluster name etc...
        print(f'set q alpha: {exp}')
        return exp, None
    # more numeric so assume numeric
    nums = re.sub('[^0-9]+', ",", exp) # replace all non-digits with comma
    nums = re.sub(',+', ",", nums) # eliminate repeated commas
    nums = nums.split(',')
    nums = [int(n) for n in nums if n] # the if clause requires non empty str
    return None, nums

def get_paper_from_list_by_nid(p_list, nid):
    filter_papers = [p for p in p_list if p.nid == nid]
    if len(filter_papers) == 1:
        return filter_papers[0]
    # possibly zero papers match (ok), but would be weird if more than 1
    return None

def clean_filter_list(p_list, nid_list):
    select_papers = [p for p in p_list if p.nid in nid_list]
    filter_papers = [get_paper_from_list_by_nid(select_papers, nid) for nid in nid_list]
    clean_list = []
    for p in filter_papers:
        if p is not None and p not in clean_list:
            clean_list.append(p)
    return clean_list

def set_queue_explicit(exp):
    label_name, nid_list = parse_explicit_queue(exp)
    print('explicit queue:', label_name, nid_list)
    papers = Paper.query.all()
    p_list = list(papers)
    if label_name:
        label = Label.query.filter_by(name=label_name).first()
        if not label:
            msg = f'No matched label for explicit queue: ({label_name})'
            print(msg)
            return msg
        filter_papers = list(label.tag_papers)
        solve_tsp = True
    else:
        filter_papers = clean_filter_list(p_list, nid_list)
        solve_tsp = False # do not reorder papers on explicit numeric list
    set_queue_to_paper_list(p_list, filter_papers, solve_tsp)
    count = len(filter_papers)
    msg = f'Explicit queue set with {count} papers.'
    return msg

def show_current_paper():
    gq = GlobQueue.query.first()
    gq.current_show = True
    gq.current_start = func.now()
    db.session.add(gq)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to show current paper'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

def set_hide_queue(hide, message):
    gq = GlobQueue.query.first()
    gq.hide_queue = hide
    gq.message = message
    db.session.add(gq)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to hide queue'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

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
    show_logs = os.getenv('REACT_APP_SHOW_LOGS')
    if (show_logs is not None):
        globs['showAppLogs'] = show_logs
    current_index = globs['current']
    paper = get_paper_at_queue_index(current_index)
    if paper:
        status = get_latest_history_status(paper)
        globs['current_status'] = status
        if globs['current_show']:
            history = get_paper_history_dump(paper)
            globs['current_history'] = history
    return globs, paper

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
    globs,current_paper = get_globs_dump_with_status()
    queue = { 'paper_list': paper_list, 'globs': globs }
    return queue,current_paper

def get_about_md():
    basedir = os.path.abspath(os.path.dirname(__file__))
    about_file = os.path.join(basedir, '../../public/about/about.md')
    with open(about_file, "r") as file:
        md = file.read()
    return md

###########
###########
########### Decorator (communication) functions mostly below here:
###########
###########

def broadcast_admin_alert(title, body):
    data = {'title':title, 'body':body, 'admin_only': True}
    emit('server_send_alert', data, broadcast=True)

@socketio.on('connect')
def io_connect():
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print(f'{user.full_name} - client connected')
    user_dump = get_user_dump(user)
    grid_dump = get_grid_dump()
    about_md = get_about_md()
    # print(about_md)
    # config_vars = get_react_env_vars()
    # later: 'config': config_vars }
    data = {'user': user_dump, 'grid': grid_dump, 'about':about_md } 
    if user.is_admin:
        all_users = get_all_user_list_dump()
        data['all_users'] = all_users
    emit('server_welcome', data)
    data,_ = get_queue()
    emit('server_set_queue', data)
    # no need to send to conflictbot here

@socketio.on('disconnect')
def io_disconnect():
    user_name = 'Unknown User'
    if current_user and not current_user.is_anonymous:
        user_name = current_user.full_name
    print(f'{user_name} - client disconnected')

@socketio.on('admin_prev_paper')
def admin_prev_paper():
    if not current_user_is_admin():
        disconnect()
        return
    print('admin request for prev paper')
    zero_or_inc_current_index(-1) # also "hides" current
    globs,current_paper = get_globs_dump_with_status()
    emit('server_set_globs', globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs,current_paper)

@socketio.on('admin_next_paper')
def admin_next_paper(status_update):
    if not current_user_is_admin():
        disconnect()
        return
    print('admin request for next paper with status:', status_update)
    before_index, paper = update_current_paper_status(status_update)
    zero_or_inc_current_index(+1) # also "hides" current
    update = { 'queue_index':before_index, 'grid_nid':paper.nid, 'status':status_update }
    globs,current_paper = get_globs_dump_with_status()
    globs['update'] = update
    emit('server_set_globs', globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs,current_paper)

@socketio.on('admin_show_current')
def admin_show_current():
    if not current_user_is_admin():
        disconnect()
        return
    print('admin request for show paper')
    show_current_paper()
    globs,current_paper = get_globs_dump_with_status()
    emit('server_set_globs', globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs,current_paper)

@socketio.on('admin_hide_queue')
def admin_hide_queue(data):
    if not current_user_is_admin():
        disconnect()
        return
    hide = data['hide']
    message = data['message']
    print(f'admin request for hide queue: {hide} {message}')
    set_hide_queue(hide, message)
    globs,current_paper = get_globs_dump_with_status()
    emit('server_set_globs', globs, broadcast=True)
    conflictbots_broadcast_conflicts(globs,current_paper)
    if hide:
        reply = "Queue is now hidden for everyone except the admin."
    else:
        reply = "Queue is now visible for everyone."
    data = { 'message': reply, 'type': 'success', 'which': 'hide_queue'}
    emit('server_send_flasher', data)

@socketio.on('admin_set_queue')
def admin_set_queue(filters):
    if not current_user_is_admin():
        disconnect()
        return
    print('admin request for set queue:', filters)
    set_queue(filters)
    queue,current_paper = get_queue()
    emit('server_set_queue', queue, broadcast=True)
    globs = queue['globs']
    conflictbots_broadcast_conflicts(globs,current_paper)

@socketio.on('admin_probe_queue')
def admin_probe_queue(filters):
    if not current_user_is_admin():
        disconnect()
        return
    print('admin probe queue:', filters)
    count = get_filter_paper_count(filters)
    emit('server_probe_count', count)

@socketio.on('admin_set_queue_explicit')
def admin_set_queue_explicit(data):
    if not current_user_is_admin():
        disconnect()
        return
    print('admin request for set explicit queue:', data)
    msg = set_queue_explicit(data)
    queue,current_paper = get_queue()
    emit('server_set_queue', queue, broadcast=True)
    globs = queue['globs']
    conflictbots_broadcast_conflicts(globs,current_paper)
    data = { 'message': msg, 'type': 'success', 'which': 'set_explicit'}
    emit('server_send_flasher', data)

@socketio.on('admin_set_bar')
def admin_set_bar(bar):
    if not current_user_is_admin():
        disconnect()
        return
    print(f'admin request set bar to {bar}')
    set_bar(bar)
    globs,_ = get_globs_dump_with_status()
    emit('server_set_globs', globs, broadcast=True)
    grid_dump = get_grid_dump()
    emit('server_set_grid', grid_dump, broadcast=True)
    message = f'Bar is now updated ({bar}).'
    data = { 'message': message, 'type': 'success', 'which': 'change_bar'}
    emit('server_send_flasher', data)

@socketio.on('admin_bulk_reject')
def admin_bulk_reject():
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    msg = 'got request admin_bulk_reject'
    print(msg)
    success = bulk_reject_below_bar()
    if success:
        grid_dump = get_grid_dump()
        emit('server_set_grid', grid_dump, broadcast=True)
        msg = 'Mark unseen reject papers below bar as now seen.'
        data = { 'message': msg, 'type': 'success', 'which': 'change_bar'}
        emit('server_send_flasher', data)

@socketio.on('user_set_stickie')
def user_set_stickie(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    print('user request for set stickie:', data)
    nid = data['nid']
    status = data['status']
    paper = Paper.query.filter_by(nid=nid).first()
    if not paper:
        return # should never happen because it is now checked at the client
    context_stickie = int(HistoryContext.Stickie)
    status_enum = status_str_to_enum(status)
    history = History(paper=paper,
                    context_enum=context_stickie,
                    status_enum=status_enum)
    db.session.add(history)
    try:
        db.session.commit()
        emit('server_set_stickie', nid, broadcast=True)
        message = f'Stickie filed for paper {nid} ({status}).'
        data = { 'message': message, 'type': 'success', 'which': 'stickie'}
        emit('server_send_flasher', data)
    except:
        db.session.rollback()
        msg = f'Failed attempt to file stickie for paper {nid} ({status}).'
        print(msg)
        broadcast_admin_alert('Server Error',msg)

@socketio.on('user_change_password')
def user_change_password(data):
    user = get_current_user_or_none()
    if not user:
        disconnect()
        return
    new_password = data['password']
    for_email = data['forEmail']
    if for_email:
        for_user = User.query.filter_by(email=for_email).first()
        if not user.is_admin or not for_user:
            success = False
        else:
            success = True
            for_name = for_user.full_name
            message = f"You have changed the password for {for_name}."
    else:
        success = True
        for_user = user # self
        message = "You have successfully changed your password."
    if success:
        print(f'change password for {for_user.full_name}')
        for_user.password = new_password
        db.session.add(for_user)
        try:
            db.session.commit()
            message_type = 'success'
        except:
            db.session.rollback()
            success = False
    if not success:
        message = "Error setting password."
        message_type = 'warning'
    reply = { 'message': message, 'type': message_type, 'which': 'change_password'}
    emit('server_send_flasher', reply)

#################################################
#
# Conflictbot below here:
#
#################################################

class Conflictbot(Namespace):
    def on_connect(self):
        print('conflictbot connected:', self)
        print('sending user list.')
        users_dump = get_all_user_list_dump()
        emit('user-list', users_dump)
        # next we can broadcast status to all conflictbots, including this
        globs,current_paper = get_globs_dump_with_status()
        conflictbots_broadcast_conflicts(globs,current_paper)

    def on_disconnect(self):
        print('conflictbot disconnected')

# ??? later change this lurk variable to environment
conflictbot_namespace = '/lurk_NxtCmHS8aDj6'

def conflictbots_broadcast_conflicts(globs, current_paper):
    hide = globs['hide_queue']
    show = globs['current_show']
    if hide:
        show = False
    # if hide: queue is hidden so there are NO CONFLICTS:
    if hide or not current_paper or not current_paper.conf_users:
        nid = 0
        conflict_emails = []
    else:
        nid = current_paper.nid
        conflict_list = list(current_paper.conf_users)
        conflict_emails = get_user_list_emails(conflict_list)
    data = { 'paper': nid, 'show': show, 'emails': conflict_emails}
    emit('conflicts', data, namespace=conflictbot_namespace, broadcast=True)

socketio.on_namespace(Conflictbot(conflictbot_namespace))
