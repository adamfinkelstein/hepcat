from os import getcwd, getenv
from os.path import join
from dotenv import load_dotenv


basedir = getcwd()


def subdir_path(dir):
    return join(basedir, dir)


def is_float(str):
    try:
        float(str)
        return True
    except ValueError:
        return False


# return environment variable.
# return default, if var does not exist or is empty string.
def env_get_str(name, default=None):
    # could also use os.environ.get (similar)
    return getenv(name) or default


# return False for any of these:
#   empty string, 0, false, False, FALSE
# otherwise any string returns True
def env_get_bool(name, default=False):
    var = env_get_str(name, None)
    if var is None:
        return default
    lower = var.lower()
    if not lower or lower == "false" or lower == "0":
        return False
    return True


# return integer from environment variable.
# return default if var does not exist or is not all digits.
def env_get_int(name, default=0):
    var = env_get_str(name)
    if not var or not var.isdigit():
        return default
    return int(var)


# return float from environment variable.
# return default if var does not exist or is not all digits.
def env_get_float(name, default=0.0):
    var = env_get_str(name)
    if not var or not is_float(var):
        return default
    return float(var)


default_db = "sqlite:///" + subdir_path("data.sqlite")

dotenv_path = join(basedir, ".env")
print(f"loading .env file: {dotenv_path}")
load_dotenv(dotenv_path)


class Config:
    SECRET_KEY = env_get_str("SECRET_KEY", "UeVbP7PG4RmtNhz")
    HEPCAT_SHOW_LOGS = env_get_bool("HEPCAT_SHOW_LOGS", False)
    HEPCAT_LOG_LEVEL = env_get_str("HEPCAT_LOG_LEVEL", "INFO")
    HEPCAT_SHOW_TIMERS = env_get_bool("HEPCAT_SHOW_TIMERS", False)
    HEPCAT_TSP_DISABLED = env_get_bool("HEPCAT_TSP_DISABLED", False)
    HEPCAT_USE_ORTOOLS = env_get_bool("HEPCAT_USE_ORTOOLS", False)
    HEPCAT_OMIT_EXCEPTIONS = env_get_bool("HEPCAT_OMIT_EXCEPTIONS", True)
    HEPCAT_TSP_MAX = env_get_int("HEPCAT_TSP_MAX", 60)
    HEPCAT_TEST_UPLOAD = env_get_str("HEPCAT_TEST_UPLOAD", "./tests/test-data")
    HEPCAT_TEST_HISTORY = env_get_int("HEPCAT_TEST_HISTORY", 0)  # 0=none
    HEPCAT_TEST_ACTIONS = env_get_int("HEPCAT_TEST_ACTIONS", 0)  # 0=none
    HEPCAT_TEST_AUTO_INIT = env_get_bool("HEPCAT_TEST_AUTO_INIT", True)
    HEPCAT_RECORD_ADMIN = env_get_bool("HEPCAT_RECORD_ADMIN", True)
    HEPCAT_CACHE_NAME = env_get_str("HEPCAT_CACHE_NAME", "cache")  # or "" for no cache
    HEPCAT_CACHE_DIR = subdir_path(HEPCAT_CACHE_NAME) if HEPCAT_CACHE_NAME else None

    CONFLICTBOT_NAMESPACE = env_get_str("CONFLICTBOT_NAMESPACE")
    CONFLICTBOT_ZOOM_CLIENT_ID = env_get_str("CONFLICTBOT_ZOOM_CLIENT_ID")
    CONFLICTBOT_ZOOM_CLIENT_SECRET = env_get_str("CONFLICTBOT_ZOOM_CLIENT_SECRET")

    HEPCAT_ADMIN_LOGIN = env_get_str("HEPCAT_ADMIN_LOGIN", "admin@example.com")
    HEPCAT_ADMIN_PASSWD = env_get_str("HEPCAT_ADMIN_PASSWD", "pass")
    HEPCAT_CHAIR_LOGIN = env_get_str("HEPCAT_CHAIR_LOGIN", "chair@example.com")
    HEPCAT_CHAIR_PASSWD = env_get_str("HEPCAT_CHAIR_PASSWD", "pass")
    HEPCAT_SCREEN_LOGIN = env_get_str("HEPCAT_SCREEN_LOGIN", "screen@example.com")
    HEPCAT_SCREEN_PASSWD = env_get_str("HEPCAT_SCREEN_PASSWD", "pass")
    OMIT_USER_DOMAINS = env_get_str("OMIT_USER_DOMAINS", "linklings.com")
    DISABLE_PASSWORD_CACHE = env_get_bool("DISABLE_PASSWORD_CACHE", False)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = env_get_str("DEV_DATABASE_URL", default_db)
    SQLALCHEMY_POOL_SIZE = env_get_int("SQLALCHEMY_POOL_SIZE", 0)  # 0=use default

    USE_EVENTLET = env_get_bool("USE_EVENTLET")
    ALLOW_CORS = env_get_bool("ALLOW_CORS")

    # https://sendgrid.com/en-us/blog/sending-emails-from-python-flask-applications-with-twilio-sendgrid
    MAIL_SERVER = env_get_str("MAIL_SERVER", "smtp.sendgrid.net")
    MAIL_PORT = env_get_int("MAIL_PORT", 587)
    MAIL_USE_TLS = env_get_bool("MAIL_USE_TLS", True)
    MAIL_USERNAME = env_get_str("MAIL_USERNAME", "apikey")
    MAIL_PASSWORD = env_get_str("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = "noreply@hepcat.app"

    UPLOAD_FOLDER = subdir_path("tmp")
    BIN_FOLDER = subdir_path("bin_local")
    APP_FOLDER = subdir_path("app")


class DevelopmentConfig(Config):
    DEBUG = True
    ALLOW_CORS = True
    HEPCAT_SHOW_TIMERS = True
    HEPCAT_SHOW_LOGS = True
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
