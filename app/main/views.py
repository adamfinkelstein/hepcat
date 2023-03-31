from flask import redirect, url_for, request, send_from_directory
from flask_login import login_required, current_user
from . import main
from .. import static_folder
from ..models import ensure_admin    

@main.before_app_first_request
def before_app_first_request():
    #app.logger.info("before_first_request")
    #print("before_app_first_request: ensure_admin")
    ensure_admin()

@main.before_app_request
def before_main_request():
    if not (current_user and current_user.is_authenticated) \
            and request.endpoint \
            and request.blueprint != 'auth' \
            and request.endpoint != 'static':
        print('user not authenticated ... send to login')
        main_index = 'main.send_static_index' 
        return redirect(url_for(main_index))
        # old version: return redirect(url_for('auth.login'))

@main.route("/about/")
@main.route("/auth_login/")
@main.route("/preferences/")
@main.route("/")
# @login_required - no longer needed! AF XXX!!!
def send_static_index():
    print('send index from static folder: ' + static_folder)
    return send_from_directory(static_folder, 'index.html')

@main.route("/test/")
def test():
    return "this is a test"
    