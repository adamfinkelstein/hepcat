import json
from gitinfo import get_git_info


def get_git_info_from_repo():
    keys = 'commit,author,author_date,message'.split(',')
    info = get_git_info()
    result = {}
    for key in keys:
        if info and key in info:
            result[key] = info[key]
    return result


def info_to_md(info):
    result = '\n\n### Git Version\n\n'
    for key in info:
        result += f'* {key}: {info[key]}\n\n'
    return result


if __name__ == '__main__':
    info = get_git_info_from_repo()
    md = info_to_md(info)
    # info_file = 'git-info.md'
    # with open(info_file, "w") as file:
    #     file.write(md)
    # print(f'wrote this to file {info_file}:')
    json_string = json.dumps(info)
    json_string = json_string.replace("'", "")  # remove single quotes
    json_string = json_string.replace('"', "'")  # replace double w single
    print(json_string)
