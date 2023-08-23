from flask import (
    abort,
    flash,
    render_template,
    send_file,
    current_app,
)
from . import admin
from ..uploads import write_kind_of_csv, write_zip_of_all_csvs


@admin.route("/download_csv/<kind>/<key>")
def download_results_csv(kind, key):
    inst = current_app.config["INSTANCE"]
    if key == inst:
        print(f"getting {kind} csv...")
        fullpath = write_kind_of_csv(kind)
        if fullpath:
            return send_file(fullpath, as_attachment=True)
    msg = "Sorry -- something is wrong. Try logging back in."
    flash(msg)
    return abort(404)


@admin.route("/download_zip/<key>")
def download_zip(key):
    inst = current_app.config["INSTANCE"]
    if key == inst:
        print("getting zip...")
        fullpath = write_zip_of_all_csvs()
        if fullpath:
            return send_file(fullpath, as_attachment=True)
    msg = "Sorry -- something is wrong. Try logging back in."
    flash(msg)
    return abort(404)


@admin.route("/zoom_conflictbot/<key>")
def zoom_conflictbot(key):
    inst = current_app.config["INSTANCE"]
    if key != inst:
        msg = "Sorry -- the admin key is wrong. Try logging back in."
        flash(msg)
        return abort(404)
    url = f"/admin/zoom_conflictbot/{inst}"
    client_id = current_app.config["ZOOM_CONFLICTBOT_CLIENT_ID"]
    client_secret = current_app.config["ZOOM_CONFLICTBOT_CLIENT_SECRET"]
    conflictbot_socket = current_app.config["HEPCAT_CONFLICTBOT_SOCKET"]
    return render_template(
        "zoom-conflictbot.html",
        conflictbot_socket=conflictbot_socket,
        url=url,
        client_id=client_id,
        client_secret=client_secret,
    )
