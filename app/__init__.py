import sys
import os
import uuid
import logging
from flask import Flask
from flask_bootstrap import Bootstrap
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_socketio import SocketIO
from flask_cors import CORS
from config import config

bootstrap = Bootstrap()
mail = Mail()
db = SQLAlchemy()
ma = Marshmallow()
static_folder = ""  # this global is set in create_app below

socketio = SocketIO()

def create_app(config_name, build_path):
    global static_folder
    app = Flask(__name__, static_url_path="", static_folder=build_path)
    app.config.from_object(config[config_name])
    static_folder = build_path  # save this for use in app/main
    if app.config["ALLOW_CORS"]:
        CORS(app)
        print("ALLOW_CORS - allowing cross origin requests on APP")
    
    # a random string associated with this instance
    app.config["INSTANCE"] = uuid.uuid4().hex

    pool_size = os.getenv("SQLALCHEMY_POOL_SIZE")
    if pool_size:
        # set the connection pool size for sqlalchemy (default 5, 0=no limit)
        # https://stackoverflow.com/questions/33680429/whats-the-session-option-key-for-sqlalchemy-pool-size
        # https://stackoverflow.com/questions/71039080/how-to-control-the-connection-pool-size-in-flask-sqlalchemy
        # https://docs.sqlalchemy.org/en/20/core/engines.html#sqlalchemy.create_engine.params.pool_size
        # Note we could also consider adjusting 'max_overflow' (default 10) in addition to 'pool_size'.
        pool_size = int(pool_size)
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = { 'pool_size': pool_size }
        print(f'Using SQLALCHEMY_POOL_SIZE {pool_size}')

    # to help with this
    app.logger.addHandler(logging.StreamHandler(sys.stdout))
    app.logger.setLevel(logging.ERROR)

    from .main import main as main_blueprint

    app.register_blueprint(main_blueprint)

    from .admin import admin as admin_blueprint

    app.register_blueprint(admin_blueprint, url_prefix="/admin")

    from .sockets import sockets as sockets_blueprint

    app.register_blueprint(sockets_blueprint)

    from .cli import cli as cli_blueprint

    app.register_blueprint(cli_blueprint)

    bootstrap.init_app(app)
    mail.init_app(app)
    db.init_app(app)
    ma.init_app(app)
    # Set this in SocketIO(): max_http_buffer_size
    # See https://python-socketio.readthedocs.io/en/latest/api.html#socketio.Server
    # Default is 1^6 for 1MB. Probably want larger for file uploads, so set to 10MB:
    max_http_buffer_size = 10 * 1024 * 1024
    cors_allowed_origins = None
    if app.config["ALLOW_CORS"] or app.config["ALLOW_CORS_SOCKET"]:
        cors_allowed_origins = "*"
    async_mode = "threading"
    if app.config["USE_EVENTLET"]:
        async_mode="eventlet"
    socketio.init_app(
        app,
        max_http_buffer_size=max_http_buffer_size,
        async_mode=async_mode,
        cors_allowed_origins=cors_allowed_origins,
    )

    with app.app_context():
        # AF added this to create db without migrations. It is idempotent.
        # Follows this:
        # https://stackoverflow.com/questions/19437883/when-scattering-flask-models-runtimeerror-application-not-registered-on-db-w
        db.create_all()

    return app
