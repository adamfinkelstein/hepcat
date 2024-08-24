from .tables import db
from .helpers import get_or_create_gq


def set_bar(bar):
    bar = float(bar)
    gq = get_or_create_gq("Plenary")
    gq.bar = bar
    db.session.add(gq)


def get_bar():
    gq = get_or_create_gq("Plenary")
    if gq:
        return gq.bar
    return 0.0
