# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from flask import Blueprint

main = Blueprint("main", __name__)

from . import views, errors  # noqa: F401,E402
