# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

import os
import shutil
import pickle
from subprocess import run
from timeit import default_timer as timer
from flask import current_app


#######################
#
# logging for this module
#
#######################


log_print_set_on_init = None


def init_util(log_print):
    global log_print_set_on_init
    log_print_set_on_init = log_print
    invalidate_cache_all()


def log_print_util(msg):
    if log_print_set_on_init is None:
        print(f"no log so print: {msg}")
    else:
        log_print_set_on_init(msg)


#######################
#
# Timer
#
#######################


def timer_start():
    global time_start
    if not current_app.config["HEPCAT_SHOW_TIMERS"]:
        return
    time_start = timer()


def timer_end(msg="", reset=False):
    if not current_app.config["HEPCAT_SHOW_TIMERS"]:
        return
    time_end = timer()
    time_ms = round(1000 * (time_end - time_start))
    log_print_util(f"::: {msg} time: {time_ms}ms")
    if reset:
        timer_start()


#######################
#
# Files and OS
#
#######################


def remove_folder_tree_if_exists(path):
    if os.path.exists(path):
        shutil.rmtree(path)


def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def remove_dir_recursive(dir):
    if os.path.exists(dir):
        shutil.rmtree(dir)


def remove_file_if_exists(path):
    if os.path.exists(path):
        os.remove(path)


def write_text_to_file(text, filename):
    with open(filename, "w") as f:
        f.write(text)


def write_data_to_file(data, filename):
    with open(filename, "wb") as f:
        f.write(data)


def read_text_from_file(filename):
    if not os.path.exists(filename):
        return None
    with open(filename, "r") as f:
        return f.read()


def read_lines_from_file(filename):
    if not os.path.exists(filename):
        return None
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


def invalidate_cache_all():
    cache_dir = current_app.config["HEPCAT_CACHE_DIR"]
    if cache_dir:
        remove_dir_recursive(cache_dir)
        log_print_util(f"removed cache dir {cache_dir}")


def name_to_pickle_fname(dir, name):
    # possibly add something relating to the process id
    # to help prevent stale data.
    fname = f"{dir}/pickle-{name}.dat"
    return fname


def write_cache_file(name, var):
    cache_dir = current_app.config["HEPCAT_CACHE_DIR"]
    make_path_if_needed(cache_dir)
    fname = name_to_pickle_fname(cache_dir, name)
    with open(fname, "wb") as handle:
        pickle.dump(var, handle, protocol=pickle.HIGHEST_PROTOCOL)
    # log_print_util(f"wrote cache file: {name}")


def read_cache_file(name):
    cache_dir = current_app.config["HEPCAT_CACHE_DIR"]
    fname = name_to_pickle_fname(cache_dir, name)
    if not os.path.exists(fname):
        return None
    with open(fname, "rb") as handle:
        var = pickle.load(handle)
    # log_print_util(f"did read cache file: {name}")
    return var


def invalidate_cache_var(name):
    cache_dir = current_app.config["HEPCAT_CACHE_DIR"]
    if not cache_dir:
        return
    fname = name_to_pickle_fname(cache_dir, name)
    if os.path.exists(fname):
        os.remove(fname)
        log_print_util(f"removed cache file {fname}")


def get_cache_var_dump(name, dump_func, func_arg, refresh_cache):
    timer_start()
    var_dump = None
    cache_dir = current_app.config["HEPCAT_CACHE_DIR"]
    if cache_dir and not refresh_cache:
        var_dump = read_cache_file(name)
    read_failed = not var_dump
    if read_failed:
        var_dump = dump_func(func_arg) if func_arg else dump_func()
    if cache_dir and read_failed:
        write_cache_file(name, var_dump)
    in_cache_str = "not cached" if read_failed else "in cache"
    timer_end(f"cache var {name} {in_cache_str}")
    return var_dump
