from flask import render_template, flash, current_app
from . import main


@main.route('/')
def index():
    return render_template('index.html')

# AF: this function and the following route are for debugging internal variables
def debugConfigToString(config):
    output = '\n'
    for key in config:
        val = config[key]
        if type(val) == str:
            output += f'{key} : {val}\n'
    return output

@main.route('/debug/')
def debug():
    debug_title = False
    debug_output = 'Nothing to see here.'
    app = current_app._get_current_object()
    if app and app.config:
        debug_title = "app.config"
        debug_output = debugConfigToString(app.config)
    return render_template('debug.html', 
        debug_title=debug_title, debug_output=debug_output)
