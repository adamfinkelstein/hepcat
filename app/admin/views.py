from flask import abort, send_file
from . import admin
from .downloads import verify_download_key


@admin.route("/download_file/<filename>/<key>")
def download_file(filename, key):
    fullpath = verify_download_key(filename, key)
    if not fullpath:
        return abort(404)
    return send_file(fullpath, as_attachment=True)
