from app.basics import subdir_path, env_get_str, env_get_bool, env_get_int

default_db = "sqlite:///" + subdir_path("data.sqlite")


class Config:
    SECRET_KEY = env_get_str("SECRET_KEY", "UeVbP7PG4RmtNhz")
    REACT_APP_SHOW_LOGS = env_get_bool("REACT_APP_SHOW_LOGS", False)
    HEPCAT_LOG_LEVEL = env_get_str("HEPCAT_LOG_LEVEL", "INFO")
    HEPCAT_SHOW_TIMERS = env_get_bool("HEPCAT_SHOW_TIMERS", False)
    HEPCAT_TSP_DISABLED = env_get_bool("HEPCAT_TSP_DISABLED", False)
    HEPCAT_USE_ORTOOLS = env_get_bool("HEPCAT_USE_ORTOOLS", False)
    HEPCAT_TSP_MAX = env_get_int("HEPCAT_TSP_MAX", 60)
    HEPCAT_TEST_UPLOAD = env_get_str("HEPCAT_TEST_UPLOAD", "./tests/test-data")
    HEPCAT_TEST_HISTORY = env_get_bool("HEPCAT_TEST_HISTORY", True)
    HEPCAT_TEST_ACTIONS = env_get_bool("HEPCAT_TEST_ACTIONS", True)
    HEPCAT_RECORD_ADMIN = env_get_bool("HEPCAT_RECORD_ADMIN", True)

    CONFLICTBOT_NAMESPACE = env_get_str("CONFLICTBOT_NAMESPACE")
    CONFLICTBOT_ZOOM_CLIENT_ID = env_get_str("CONFLICTBOT_ZOOM_CLIENT_ID")
    CONFLICTBOT_ZOOM_CLIENT_SECRET = env_get_str("CONFLICTBOT_ZOOM_CLIENT_SECRET")

    HEPCAT_ADMIN_LOGIN = env_get_str("HEPCAT_ADMIN_LOGIN", "admin@example.com")
    HEPCAT_ADMIN_PASSWD = env_get_str("HEPCAT_ADMIN_PASSWD", "pass")
    HEPCAT_CHAIR_LOGIN = env_get_str("HEPCAT_CHAIR_LOGIN", "chair@example.com")
    HEPCAT_CHAIR_PASSWD = env_get_str("HEPCAT_CHAIR_PASSWD", "pass")
    HEPCAT_SCREEN_LOGIN = env_get_str("HEPCAT_CHAIR_LOGIN", "screen@example.com")
    HEPCAT_SCREEN_PASSWD = env_get_str("HEPCAT_CHAIR_PASSWD", "pass")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = env_get_str("DEV_DATABASE_URL", default_db)
    SQLALCHEMY_POOL_SIZE = env_get_int("SQLALCHEMY_POOL_SIZE", 0)  # 0=use default

    USE_EVENTLET = env_get_bool("USE_EVENTLET")
    ALLOW_CORS = env_get_bool("ALLOW_CORS")
    ALLOW_CORS_SOCKET = env_get_bool("ALLOW_CORS_SOCKET")

    MAIL_SERVER = env_get_str("MAIL_SERVER", "smtp.sendgrid.net")
    MAIL_PORT = env_get_int("MAIL_PORT", 587)
    MAIL_USE_TLS = env_get_bool("MAIL_USE_TLS", True)
    MAIL_USERNAME = env_get_str("MAIL_USERNAME", "apikey")
    MAIL_PASSWORD = env_get_str("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = "noreply@hepcat.app"

    UPLOAD_FOLDER = subdir_path("tmp")
    BIN_FOLDER = subdir_path("local_bin")
    APP_FOLDER = subdir_path("app")
    CACHE_FOLDER = subdir_path("cache")  # NOT USED! (change to None for no cache)


class DevelopmentConfig(Config):
    DEBUG = True
    ALLOW_CORS = True
    HEPCAT_SHOW_TIMERS = True
    REACT_APP_SHOW_LOGS = True
    HEPCAT_SHOW_TIMERS = True


class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    PRODUCTION = True


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
