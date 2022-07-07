import os
from flask import Flask
from flask_bootstrap import Bootstrap
from flask_mail import Mail
from flask_moment import Moment
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_cors import CORS
from config import config

bootstrap = Bootstrap()
mail = Mail()
moment = Moment()
db = SQLAlchemy()
ma = Marshmallow()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
static_folder = '' # this global is set in create_app below

allow_cors = os.getenv('ALLOW_CORS')
if allow_cors:
    socketio = SocketIO(cors_allowed_origins="*")
    print('FLASK_ALLOW_CORS - allowing cross origin requests')
else:
    socketio = SocketIO()

def create_app(config_name, build_path):
    global static_folder
    app = Flask(__name__,
            static_url_path='', 
            static_folder=build_path)
    static_folder = build_path # save this for use in app/main
    if allow_cors:
        CORS(app)
    app.config.from_object(config[config_name])
    # config[config_name].init_app(app) # AF not needed (just pass)

    bootstrap.init_app(app)
    mail.init_app(app)
    moment.init_app(app)
    db.init_app(app)
    ma.init_app(app)
    login_manager.init_app(app)
    socketio.init_app(app)

    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from .auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/auth')

    from .debug import debug as debug_blueprint
    app.register_blueprint(debug_blueprint, url_prefix='/debug')

    from .upload import upload as upload_blueprint
    app.register_blueprint(upload_blueprint, url_prefix='/upload')

    from .sockets import sockets as sockets_blueprint
    app.register_blueprint(sockets_blueprint)

    with app.app_context():
        # AF added this to create db without migrations. It is idempotent.
        # Follows this:
        # https://stackoverflow.com/questions/19437883/when-scattering-flask-models-runtimeerror-application-not-registered-on-db-w
        db.create_all()

    return app

gq = None # this global will be set in models by the func below

def set_gq(g):
    global gq
    gq = g

def get_gq():
    global gq
    return gq