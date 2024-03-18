import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "UeVbP7PG4RmtNhz"
    ZOOM_CONFLICTBOT_CLIENT_ID = os.environ.get("ZOOM_CONFLICTBOT_CLIENT_ID")
    ZOOM_CONFLICTBOT_CLIENT_SECRET = os.environ.get("ZOOM_CONFLICTBOT_CLIENT_SECRET")
    HEPCAT_ADMIN_LOGIN = os.environ.get("HEPCAT_ADMIN_LOGIN")
    HEPCAT_ADMIN_PASSWD = os.environ.get("HEPCAT_ADMIN_PASSWD")
    HEPCAT_CHAIR_LOGIN = os.environ.get("HEPCAT_CHAIR_LOGIN")
    HEPCAT_CHAIR_PASSWD = os.environ.get("HEPCAT_CHAIR_PASSWD")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, "tmp")
    BIN_FOLDER = os.path.join(basedir, "local_bin")
    APP_FOLDER = os.path.join(basedir, "app")
    USE_EVENTLET = os.environ.get("USE_EVENTLET") # set in Procfile, if needed
    ALLOW_CORS = os.getenv("ALLOW_CORS")
    ALLOW_CORS_SOCKET = os.getenv("ALLOW_CORS_SOCKET")


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DEV_DATABASE_URL"
    ) or "sqlite:///" + os.path.join(basedir, "data-dev.sqlite")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL") or "sqlite://"
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL_HEROKU"
    ) or "sqlite:///" + os.path.join(basedir, "data.sqlite")


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
