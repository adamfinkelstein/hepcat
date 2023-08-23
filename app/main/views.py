from flask import redirect, url_for, request, send_from_directory
from . import main
from .. import static_folder
from ..models import ensure_admin

# this decorator is deprecated in flask, so remove it.
# this should be ok because ensure_admin() called at login.
# @main.before_app_first_request
# def before_app_first_request():
#     #app.logger.info("before_first_request")
#     #print("before_app_first_request: ensure_admin")
#     ensure_admin()


@main.route("/login/")
@main.route("/about/")
@main.route("/preferences/")
@main.route("/uploads/")
@main.route("/users/")
@main.route("/")
def send_static_index():
    print("send index from static folder: " + static_folder)
    return send_from_directory(static_folder, "index.html")


@main.route("/test/")
def test():
    return "this is a test"
