import os
from subprocess import run

#######################
#
# Common environment
#
#######################


def get_conflictbot_namespace():
    enabled = os.environ.get("HEPCAT_CONFLICTBOT_ENABLED")
    if not enabled:
        return None
    namespace = "/conflictbot"  # default
    from_env = os.environ.get("HEPCAT_CONFLICTBOT_SOCKET")
    if from_env:
        namespace = "/conflictbot_" + from_env
    return namespace


#######################
#
# Files and OS
#
#######################


def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)


def write_text_to_file(text, filename):
    with open(filename, "w") as f:
        f.write(text)


def write_data_to_file(data, filename):
    with open(filename, "wb") as f:
        f.write(data)


def read_text_from_file(filename):
    with open(filename, "r") as f:
        return f.read()


def read_lines_from_file(filename):
    with open(filename, "r") as f:
        return f.readlines()


# https://docs.python.org/3/library/subprocess.html#subprocess.run
# for unknown reasons, concorde returns code 255 (error) even when successful.
def run_cmd(cmd, ignore_errors=False):
    words = cmd.split()
    result = run(words, capture_output=True)
    if result.returncode and not ignore_errors:
        return False, f"run command error: {result}"
    return True, ""
