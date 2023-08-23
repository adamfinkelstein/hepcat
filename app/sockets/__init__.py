from flask import Blueprint

sockets = Blueprint("sockets", __name__)

from . import routes  # noqa: F401,E402
