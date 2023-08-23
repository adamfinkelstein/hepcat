from flask import (
    abort,
    flash,
    render_template,
    redirect,
    url_for,
    send_file,
    current_app,
)
from flask_login import login_user
from . import admin
from ..uploads import write_kind_of_csv, write_zip_of_all_csvs
from ..models import User
from .decorators import admin_required_for_route


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
        return redirect(url_for("auth.login"))
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


@admin.route("/switch_user/<email>/<key>")
@admin_required_for_route
def switch_user(email, key):
    inst = current_app.config["INSTANCE"]
    if key != inst:
        msg = "Sorry -- the admin key is wrong. Try logging back in."
        flash(msg)
        return redirect(url_for("auth.login"))
    email = email.lower()
    user = User.query.filter_by(email=email).first()
    if user:
        remember_me = True
        login_user(user, remember_me)
        msg = f"You are now logged in as {user.full_name}."
    else:
        msg = f"Unable to find user with email {email}!"
    flash(msg)
    main_index = "main.send_static_index"
    next = url_for(main_index)
    return redirect(next)
