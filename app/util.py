import os
import shutil
import pickle
from subprocess import run
from timeit import default_timer as timer
from . import log_print


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
# Timer
#
#######################


def timer_start():
    global time_start
    time_start = timer()


def timer_end(msg=""):
    global time_start
    time_end = timer()
    time_ms = round(1000 * (time_end - time_start))
    log_print(f"{msg} time in ms: {time_ms}")


#######################
#
# Files and OS
#
#######################


def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)


def remove_dir_recursive(dir):
    if os.path.exists(dir):
        shutil.rmtree(dir)


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


#######################
#
# Cache variables to file
#
#######################

cache_dir = os.getenv("HEPCAT_CACHE_DIR") or None


def invalidate_cache_all():
    if cache_dir:
        remove_dir_recursive(cache_dir)


invalidate_cache_all()  # start server with empty cache


def name_to_pickle_fname(dir, name):
    # possibly add something relating to the process id
    # to help prevent stale data.
    fname = f"{dir}/pickle-{name}.dat"
    return fname


def write_cache_file(name, var):
    make_path_if_needed(cache_dir)
    fname = name_to_pickle_fname(cache_dir, name)
    with open(fname, "wb") as handle:
        pickle.dump(var, handle, protocol=pickle.HIGHEST_PROTOCOL)
    log_print(f"wrote cache file: {name}")


def read_cache_file(name):
    fname = name_to_pickle_fname(cache_dir, name)
    if not os.path.exists(fname):
        return None
    with open(fname, "rb") as handle:
        var = pickle.load(handle)
    log_print(f"did read cache file: {name}")
    return var


def invalidate_cache_var(name):
    if not cache_dir:
        return
    fname = name_to_pickle_fname(cache_dir, name)
    if os.path.exists(fname):
        os.remove(fname)
        log_print(f"removed cache file {fname}")


def get_cache_var_dump(name, dump_func, func_arg, refresh_cache):
    timer_start()
    var_dump = None
    if cache_dir and not refresh_cache:
        var_dump = read_cache_file(name)
    read_failed = not var_dump
    if read_failed:
        var_dump = dump_func(func_arg) if func_arg else dump_func()
    if cache_dir and read_failed:
        write_cache_file(name, var_dump)
    timer_end("cache var")
    return var_dump
