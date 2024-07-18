import os

# basedir = os.path.abspath(os.path.dirname(__file__))
basedir = os.getcwd()


def subdir_path(dir):
    return os.path.join(basedir, dir)


# return environment variable.
# return default, if var does not exist or is empty string.
def env_get_str(name, default=None):
    # could also use os.environ.get (similar)
    return os.getenv(name) or default


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
