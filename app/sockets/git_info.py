# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from gitinfo import get_git_info
from flask import current_app


def info_to_txt(info):
    config_name = current_app.config["CONFIG_NAME"]
    result = f"Running in {config_name} mode. "
    result += "Git version:"
    for key in info:
        str = info[key]
        if key == "commit":
            str = str[:7]
        elif key == "message":
            str = "Comments: " + str
        result += f" {str}"
    return result


def get_git_info_from_repo():
    keys = "commit,author,author_date,message".split(",")
    info = get_git_info()
    result = {}
    for key in keys:
        if info and key in info:
            result[key] = info[key]
    result = info_to_txt(result)
    return result


if __name__ == "__main__":
    info = get_git_info_from_repo()
    print(info)
