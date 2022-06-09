from flask import Blueprint

comms = Blueprint('comms', __name__)

from . import routes
