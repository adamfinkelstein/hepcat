from gitinfo import get_git_info

def get_git_info_from_repo():
    info = get_git_info()
    if not info:
        return '\n\n### (no git info available on local machine)\n'
    result = '\n\n### Git Version\n\n'
    keys = 'commit,author,author_date,message'.split(',')
    for key in keys:
        result += f'* {key}: {info[key]}\n\n'
    return result

if __name__ == '__main__':
    md = get_git_info_from_repo()
    info_file = 'git-info.md'
    with open(info_file, "w") as file:
        file.write(md)
    print(f'wrote this to file {info_file}:')
    print(md)
