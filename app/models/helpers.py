from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from .. import db, log_print
from .tables import (
    User,
    Role,
    Paper,
    GlobQueue,
    conflicts,
    tags,
    History,
    Label,
    get_all_rooms,
)


def try_sql_commit():
    try:
        db.session.commit()
        return True
    except SQLAlchemyError:
        log_print("SQLAlchemyError! Rolling back db...")
        db.session.rollback()
        return False


######################
# Global queue vars
######################


def get_or_create_gq(room):
    gq = GlobQueue.query.filter_by(room=room).first()
    if gq:
        # log_print(f'retrieved GC with room {room}')
        return gq
    called_users = room == "Plenary"
    gq = GlobQueue(room=room, called_users=called_users)
    db.session.add(gq)
    return gq


def reset_gq(room):
    gq = GlobQueue.query.filter_by(room=room).first()
    if not gq:
        gq = get_or_create_gq(room)
    # gq.bar = 0 # too aggressive
    gq.hide_queue = False
    gq.message = ""
    gq.current = -1
    gq.current_show = False
    gq.called_users = False
    db.session.add(gq)


######################
# Helper functions
######################


def sid_to_num(sid):
    n = sid.replace("papers_", "")
    return int(n)


def num_to_sid(n):
    # should add leading zeros, but not needed if larger than 100.
    # ...actually would be awkward starting with sa23 when numbers exceed 999.
    sid = f"papers_{n}"
    return sid


def get_or_insert_role(role_name):
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        role = Role(name=role_name)
        db.session.add(role)
    return role


def ensure_user(email, first_name, last_name, role_name, passwd, room_name=None):
    user = User.query.filter_by(email=email).first()
    if not user:
        role = get_or_insert_role(role_name)
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            password=passwd,
        )
        if room_name:
            user.rooms = room_name
            user.room_name = room_name
        db.session.add(user)


def ensure_all_gqs():
    rooms = get_all_rooms()
    for room in rooms:
        get_or_create_gq(room)


def reset_all_gqs():
    rooms = get_all_rooms()
    for room in rooms:
        reset_gq(room)


def ensure_supers():
    ensure_all_gqs()  # Also init global queue variables, if needed
    # Add Admin User
    email = current_app.config["HEPCAT_ADMIN_LOGIN"]
    passwd = current_app.config["HEPCAT_ADMIN_PASSWD"]
    ensure_user(email, "Admin", "User", "Super", passwd)
    email = current_app.config["HEPCAT_CHAIR_LOGIN"]
    passwd = current_app.config["HEPCAT_CHAIR_PASSWD"]
    ensure_user(email, "Chair", "User", "Super", passwd)


def ensure_screens():
    passwd = current_app.config["HEPCAT_SCREEN_PASSWD"]
    # log_print(f"ensure_screens: passwd={passwd}")
    rooms = get_all_rooms()
    for room in rooms:
        lower = room.lower()
        email = f"screen.{lower}@example.com"
        ensure_user(email, "Screen", room, "Screen", passwd, room)
        email = f"outside.{lower}@example.com"
        ensure_user(email, "Outside", room, "Outside", passwd, room)


def dump_users_papers_and_conflicts(title):
    # ??? Later: return here, if not in special mode for debugging uploads
    num_users = User.query.count()
    num_papers = Paper.query.count()
    num_history = History.query.count()
    num_labels = Label.query.count()
    num_conf = db.session.query(conflicts).count()
    num_tags = db.session.query(tags).count()
    result = f"{title}: Users={num_users}. Papers={num_papers}. Conflicts={num_conf}."
    result += f" History={num_history}. Labels={num_labels}."
    result += f" Tags={num_tags}. "
    log_print(result)
    return result


def set_all_users_to_be_in_plenary():
    users = User.query.all()
    for user in users:
        user.room_name = "Plenary"
        db.session.add(user)


def db_is_sqlite():
    db_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
    is_sqlite = db_uri.startswith("sqlite")
    return is_sqlite


def execute_sql_cmd(cmd):
    rows = db.session.execute(db.text(cmd))
    return rows


def get_table_names():
    tables = list(db.metadata.tables.keys())
    # log_print("all db tables: ", tables)
    return tables


def sql_drop_table(table):
    is_postgres = not db_is_sqlite()
    cascade = "CASCADE" if is_postgres else ""
    cmd = f"DROP TABLE IF EXISTS {table} {cascade};\n"
    execute_sql_cmd(cmd)


def drop_and_rebuild_tables(tables_to_drop=None):
    """Drops given database tables and then rebuilds everything.
    Table names are listed in string argument, comma separated.
    If argument is None (or omitted or empty), all tables dropped."""
    all_tables = get_table_names()
    if tables_to_drop:
        drop_list = tables_to_drop.split(",")
    else:
        tables_to_drop = "ALL"
        drop_list = all_tables
    # We should call db.close_all_sessions() here...
    log_print(f"About to drop tables: {tables_to_drop}")
    for table in drop_list:
        if table in all_tables:
            sql_drop_table(table)
        else:
            log_print(f"no need to drop non-existent table {table}")
    # log_print("having dropped tables, about to rebuild...")
    # AF??? Possibly better to use close_all_sessions...?
    if not try_sql_commit():  # needed before create_all below
        log_print("sql commit error dropping tables")
    db.create_all()
    # log_print("...rebuild done.")


def wipe_db_clean():
    db.close_all_sessions()  # needed before drop_all below
    log_print("wipe_db_clean: about to drop all db tables...")
    db.drop_all()
    log_print("wipe_db_clean: about to create all db tables...")
    db.create_all()
