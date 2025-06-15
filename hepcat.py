# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from config import subdir_path, env_get_str, env_get_bool

if env_get_bool("USE_EVENTLET"):
    # monkey patch the standard library to make it non-blocking under eventlet
    # this also includes a patch for psycopg2
    import eventlet

    eventlet.monkey_patch()

import sys
import click
from flask.cli import FlaskGroup
from app import create_app, log_print, socketio


def create_configured_app():
    config_name = env_get_str("FLASK_CONFIG", "default")
    build_path = subdir_path("build")
    log_print("creating app with config: " + config_name)
    log_print("build path: " + build_path)
    return create_app(config_name, build_path)


@click.group(cls=FlaskGroup, create_app=create_configured_app)
def cli():
    """Management script for Hepcat"""


app = create_configured_app()


if __name__ == "__main__":
    if len(sys.argv) <= 1:
        # no arguments provided, run the web app as usual
        log_print("running from main using socketio...")
        socketio.run(app)
    else:
        # arguments were provided, run the Flask CLI
        cli()
