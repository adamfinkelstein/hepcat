from flask import render_template, flash, current_app
from . import main
from .. import db
from ..models import User, ensure_admin

@main.before_app_first_request
def before_app_first_request():
    #app.logger.info("before_first_request")
    #print("before_app_first_request: ensure_admin")
    ensure_admin()

@main.route('/')
def index():
    return render_template('index.html')

