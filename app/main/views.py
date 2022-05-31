from flask import render_template, flash, current_app
from . import main
from .. import db
from ..models import User

@main.route('/')
def index():
    return render_template('index.html')
