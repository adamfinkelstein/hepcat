import os
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'UeVbP7PG4RmtNhz'
    ZOOM_CONFLICTBOT_CLIENT_ID = os.environ.get('ZOOM_CONFLICTBOT_CLIENT_ID')
    ZOOM_CONFLICTBOT_CLIENT_SECRET = os.environ.get('ZOOM_CONFLICTBOT_CLIENT_SECRET')
    HEPCAT_CONFLICTBOT_SOCKET = os.environ.get('HEPCAT_CONFLICTBOT_SOCKET')
    HEPCAT_ADMIN_LOGIN = os.environ.get('HEPCAT_ADMIN_LOGIN')
    HEPCAT_ADMIN_PASSWD = os.environ.get('HEPCAT_ADMIN_PASSWD')
    HEPCAT_CHAIR_LOGIN = os.environ.get('HEPCAT_CHAIR_LOGIN')
    HEPCAT_CHAIR_PASSWD = os.environ.get('HEPCAT_CHAIR_PASSWD')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, 'tmp')
    BIN_FOLDER = os.path.join(basedir, 'custom_bin')


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'data-dev.sqlite')


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        'sqlite://'


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL_HEROKU') or \
        'sqlite:///' + os.path.join(basedir, 'data.sqlite')


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,

    'default': DevelopmentConfig
}
