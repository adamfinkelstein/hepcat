from flask import send_from_directory
from . import main
from .. import static_folder


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
