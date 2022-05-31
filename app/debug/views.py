from flask import render_template, flash, current_app
from . import debug
from .. import db
from ..models import Role, User

# AF: this function and the following route are for debugging internal variables
def debugConfigToString(config):
    output = '\n'
    for key in config:
        val = config[key]
        if type(val) == str:
            output += f'{key} : {val}\n'
    return output

@debug.route('/')
def debugMain():
    debug_title = False
    debug_output = 'Nothing to see here.'
    app = current_app._get_current_object()
    if app and app.config:
        debug_title = "app.config"
        debug_output = debugConfigToString(app.config)
    return render_template('debug.html', 
                            debug_title=debug_title, debug_output=debug_output)


@debug.route('/users/')
def users():
    users = User.query.all()
    debug_title = "Users"
    debug_output = '\n'
    for user in users:
        debug_output += user.first_name + ' ' + user.last_name + ' ' + user.email + '\n'
    return render_template('debug.html', 
                            debug_title=debug_title, debug_output=debug_output)

@debug.route('/roles/')
def roles():
    roles = Role.query.all()
    debug_title = "Roles"
    debug_output = '\n'
    for role in roles:
        debug_output += role.name + '\n'
    return render_template('debug.html', 
                            debug_title=debug_title, debug_output=debug_output)

