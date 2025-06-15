# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from flask import Blueprint

cli = Blueprint("cli", __name__, cli_group=None)

from . import commands  # noqa: F401,E402
