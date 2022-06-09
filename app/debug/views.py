import textwrap
from flask import render_template, flash, current_app
from flask_login import login_required, current_user
from . import debug
from .. import db
from ..models import Role, User, Paper, num_to_sid

def re_wrap_text_output(output):
    result = ''
    wrapper = textwrap.TextWrapper(width=80)
    lines = output.split('\n')
    for line in lines:
        result += wrapper.fill(text=line) + '\n'
    return result

def render_debug(title, output):
    output = re_wrap_text_output(output)
    return render_template('debug.html', 
                            debug_title=title, debug_output=output)

def debug_orm_to_string(orm):
    output = '\n'
    obj = orm.__dict__
    lines = []
    for key in obj:
        val = obj[key]
        typ = type(val)
        if typ != str and typ != int:
            val = typ.__name__
        line = f'{key} : {val}'
        lines.append(line)
    lines.sort()
    sep = '\n\n'
    output = sep + sep.join(lines) + sep
    return output

# AF: this function and the following route are for debugging internal variables
def debug_config_to_string(config):
    output = '\n'
    for key in config:
        val = config[key]
        if type(val) == str:
            output += f'{key} : {val}\n'
    return output

@debug.route('/')
@login_required
def debugMain():
    debug_title = False
    debug_output = 'Nothing to see here.'
    app = current_app._get_current_object()
    if app and app.config:
        debug_title = 'app.config'
        debug_output = debug_config_to_string(app.config)
    return render_debug(debug_title, debug_output)

@debug.route('/users/')
@login_required
def users():
    users = User.query.all()
    debug_title = 'Users'
    debug_output = '\n'
    for user in users:
        debug_output += user.first_name + ' ' + user.last_name + ' ' + user.email + '\n'
    return render_debug(debug_title, debug_output)

@debug.route('/user/<email>')
@login_required
def user(email):
    user = User.query.filter_by(email=email).first()
    debug_title = email
    debug_output = 'No matching user found.'
    if user:
        debug_output = debug_orm_to_string(user)
    return render_debug(debug_title, debug_output)

@debug.route('/roles/')
@login_required
def roles():
    roles = Role.query.all()
    debug_title = 'Roles'
    debug_output = '\n'
    for role in roles:
        debug_output += role.name + '\n'
        users = role.users
        for user in users:
            debug_output += '* ' + user.first_name + ' ' + user.last_name + '\n'
    return render_debug(debug_title, debug_output)

@debug.route('/papers/')
@login_required
def papers():
    papers = Paper.query.all()
    debug_title = 'Papers'
    debug_output = '\n'
    for paper in papers:
        debug_output += paper.sid + ' ' + paper.title + '\n'
    return render_debug(debug_title, debug_output)

@debug.route('/paper/<sidnum>')
@login_required
def paper(sidnum):
    sid = num_to_sid(int(sidnum))
    paper = Paper.query.filter_by(sid=sid).first()
    debug_title = sid
    debug_output = 'No matching paper found.'
    if paper:
        debug_output = debug_orm_to_string(paper)
    return render_debug(debug_title, debug_output)

@debug.route('/paper_conflicts/<sidnum>')
@login_required
def paper_conflicts(sidnum):
    sid = num_to_sid(int(sidnum))
    paper = Paper.query.filter_by(sid=sid).first()
    debug_title = 'Conflicts for ' + sid
    debug_output = 'No matching paper found.'
    if paper:
        debug_output = '\n'
        for user in paper.conf_users:
            debug_output += '* ' + user.first_name + ' ' + user.last_name + '\n'
    return render_debug(debug_title, debug_output)

@debug.route('/paper_reviews/<sidnum>')
@login_required
def paper_reviews(sidnum):
    sid = num_to_sid(int(sidnum))
    paper = Paper.query.filter_by(sid=sid).first()
    debug_title = 'Conflicts for ' + sid
    debug_output = 'No matching paper found.'
    if paper:
        debug_output = '\n'
        for rev in paper.reviews:
            debug_output += debug_orm_to_string(rev) + '============\n\n\n'
    return render_debug(debug_title, debug_output)

@debug.route('/user_conflicts/<email>')
@login_required
def user_conflicts(email):
    user = User.query.filter_by(email=email).first()
    if not user:
        debug_title = 'Conflicts for ' + email
        debug_output = 'No matching user found.'
    else:
        debug_title = 'Conflicts for ' + user.first_name + ' ' + user.last_name
        debug_output = '\n'
        for paper in user.conf_papers:
            debug_output += '* ' + paper.sid + '\n'
    return render_debug(debug_title, debug_output)

@debug.route('/socketio/')
@login_required
def socketio_client():
    user_name = 'Unknown User'
    if current_user:
        user_name = current_user.get_full_name()
    return render_template('socketio.html', 
                        title='Socketio chat', name=user_name)
 