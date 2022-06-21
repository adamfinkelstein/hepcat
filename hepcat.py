import os
# import click
# from flask_migrate import Migrate
from flask import render_template, current_app, send_from_directory
from app import create_app, socketio
#from app.models import User, Role

config_name = os.getenv('FLASK_CONFIG') or 'default'

app = create_app(config_name)

### THIS WORKS BUT NOT NEEDED:
# @app.route("/chat/", endpoint='chat')
# @app.route('/chat/<path:filepath>', endpoint='chat')
# def build(filepath='index.html'):
#     print('static folder: ' + app.static_folder)
#     print('filename: ' + filepath)
#     return send_from_directory(app.static_folder, filepath)

# @app.route("/")
# @app.route('/<path:filepath>')
# def build(filepath='index.html'):
#     print('static folder: ' + app.static_folder)
#     print('filename: ' + filepath)
#     return send_from_directory(app.static_folder, filepath)

# AF removed some things here about migrations and shell contexts
if __name__ == '__main__':
    print('running from main using socketio...')
    socketio.run(app)
