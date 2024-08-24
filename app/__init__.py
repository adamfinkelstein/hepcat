import uuid
from flask import Flask, current_app
from flask_bootstrap import Bootstrap
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_socketio import SocketIO
from flask_cors import CORS
from logging.config import dictConfig
from werkzeug.middleware.proxy_fix import ProxyFix
from config import config
from .util import init_util

bootstrap = Bootstrap()
mail = Mail()
db = SQLAlchemy()
ma = Marshmallow()
static_folder = ""  # this global is set in create_app below

socketio = SocketIO()

log_initialized = False


# following https://flask.palletsprojects.com/en/2.3.x/logging/
# need to initialize logging as done here before calling it...
# ... to avoid getting default handler.
def log_init(log_level):
    global log_initialized
    if log_initialized:
        return
    log_initialized = True
    dictConfig(
        {
            "version": 1,
            "formatters": {
                "default": {
                    "format": "[%(asctime)s] %(levelname)s: %(message)s",
                }
            },
            "handlers": {
                "wsgi": {
                    "class": "logging.StreamHandler",
                    "stream": "ext://flask.logging.wsgi_errors_stream",
                    "formatter": "default",
                }
            },
            "root": {"level": log_level, "handlers": ["wsgi"]},
        }
    )


def log_print_uninitialized(msg):
    print(f"no log so print: {msg}")


def log_print(msg, level="info", app=None):
    global log_initialized
    msg = str(msg)  # cast to string in case it is something else
    if not log_initialized:
        log_print_uninitialized(msg)
        return
    if not app:
        app = current_app
    failed = True
    try:
        if app and hasattr(app, "logger") and hasattr(app.logger, level):
            log = getattr(app.logger, level)
            log(msg)
            failed = False
    except Exception:
        pass
    if failed:  # due to missing: app, or logger, or log level
        log_print_uninitialized(msg)


def create_app(config_name, build_path):
    global static_folder
    app = Flask(__name__, static_url_path="", static_folder=build_path)
    app.config.from_object(config[config_name])
    app.config["CONFIG_NAME"] = config_name
    log_init(app.config["HEPCAT_LOG_LEVEL"])

    static_folder = build_path  # save this for use in app/main
    if app.config["ALLOW_CORS"]:
        CORS(app)
        log_print("ALLOW_CORS - allowing cross origin requests on APP", "info", app)

    # a random string associated with this instance
    app.config["INSTANCE"] = uuid.uuid4().hex

    pool_size = app.config["SQLALCHEMY_POOL_SIZE"]
    if pool_size:
        # set the connection pool size for sqlalchemy (default 5, 0=no limit)
        # https://stackoverflow.com/questions/33680429/whats-the-session-option-key-for-sqlalchemy-pool-size
        # https://stackoverflow.com/questions/71039080/how-to-control-the-connection-pool-size-in-flask-sqlalchemy
        # https://docs.sqlalchemy.org/en/20/core/engines.html#sqlalchemy.create_engine.params.pool_size
        # Note we automatically set 'max_overflow' (default 10) to double
        # 'pool_size' (default 5).
        pool_size = int(pool_size)
        max_overflow = 2 * pool_size
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_size": pool_size,
            "max_overflow": max_overflow,
        }
        log_print(f"Using SQLALCHEMY_POOL_SIZE {pool_size}", "info", app)

    # to help with this (old version, to catch print at Heroku?)
    # app.logger.addHandler(logging.StreamHandler(sys.stdout))
    # app.logger.setLevel(logging.ERROR)

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
    max_http_buffer_size = 10 * 1024 * 1024  # 10MB
    cors_allowed_origins = None
    if app.config["ALLOW_CORS"] or app.config["ALLOW_CORS_SOCKET"]:
        cors_allowed_origins = "*"
        msg = "ALLOW_CORS_SOCKET - allowing cross origin requests on socket"
        log_print(msg, "info", app)
    async_mode = "threading"
    if app.config["USE_EVENTLET"]:
        async_mode = "eventlet"
    socketio.init_app(
        app,
        max_http_buffer_size=max_http_buffer_size,
        async_mode=async_mode,
        cors_allowed_origins=cors_allowed_origins,
    )

    # This trick deals with a problem: the app is not yet created.
    # It creates a fake env with variables like current_app.
    # Trick could also be used to set a global var at startup.
    with app.app_context():
        # AF added this to create db without migrations.
        # create_all() is idempotent so can be called even if db exists.
        # Follows this:
        # https://stackoverflow.com/questions/19437883/when-scattering-flask-models-runtimeerror-application-not-registered-on-db-w
        db.create_all()
        # pass log_print to avoid circular import in util
        init_util(log_print)

    # tell flask it is running behind a proxy
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    return app
