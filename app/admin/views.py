from flask import (
    abort,
    flash,
    send_file,
    current_app,
)
from . import admin
from .. import log_print
from ..uploads.write_csv import write_kind_of_csv, write_zip_of_all_csvs


@admin.route("/download_csv/<kind>/<key>")
def download_results_csv(kind, key):
    inst = current_app.config["APP_INSTANCE"]
    if key == inst:
        log_print(f"getting {kind} csv...")
        filename, fullpath = write_kind_of_csv(kind)
        if filename and fullpath:
            return send_file(fullpath, as_attachment=True)
    msg = "Sorry -- something is wrong. Try logging back in."
    flash(msg)
    return abort(404)


@admin.route("/download_zip/<key>")
def download_zip(key):
    inst = current_app.config["APP_INSTANCE"]
    if key == inst:
        log_print("getting zip...")
        fullpath = write_zip_of_all_csvs()
        if fullpath:
            return send_file(fullpath, as_attachment=True)
    msg = "Sorry -- something is wrong. Try logging back in."
    flash(msg)
    return abort(404)
