from flask import redirect, url_for, request, send_from_directory
from flask_login import login_required, current_user
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

@main.before_app_request
def before_main_request():
    if not (current_user and current_user.is_authenticated) \
            and request.endpoint \
            and request.blueprint != 'auth' \
            and request.endpoint != 'static':
        print('user not authenticated ... send to login')
        return redirect(url_for('auth.login'))

@main.route("/about/")
@main.route("/preferences/")
@main.route("/uploads/")
@main.route("/users/")
@main.route("/")
@login_required
def send_static_index():
    print('send index from static folder: ' + static_folder)
    return send_from_directory(static_folder, 'index.html')

@main.route("/test/")
def test():
    return "this is a test"
    