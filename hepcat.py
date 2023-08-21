#!/usr/bin/env python
import os

if os.getenv('USE_EVENTLET'):
    # monkey patch the standard library to make it non-blocking under eventlet
    # this also includes a patch for psycopg2
    import eventlet

    eventlet.monkey_patch()

import sys

import click
from flask.cli import FlaskGroup

# from flask_migrate import Migrate
# from flask import render_template, current_app, send_from_directory
from app import create_app, socketio

# from app.models import User, Role


def create_configured_app():
    config_name = os.getenv('FLASK_CONFIG') or 'default'
    build_path = os.getcwd() + '/build'
    print('creating app with config: ' + config_name)
    print('build path: ' + build_path)
    return create_app(config_name, build_path)


@click.group(cls=FlaskGroup, create_app=create_configured_app)
def cli():
    """Management script for Hepcat"""


app = create_configured_app()

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
    if len(sys.argv) <= 1:
        # no arguments provided, run the web app as usual
        print('running from main using socketio...')
        socketio.run(app)
    else:
        # arguments were provided, run the Flask CLI
        cli()
