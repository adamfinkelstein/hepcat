# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from flask import Blueprint

admin = Blueprint("admin", __name__)

from . import views  # noqa: F401,E402
