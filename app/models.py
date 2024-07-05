from enum import IntEnum
from time import time
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
from sqlalchemy.orm import column_property
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import func
import jwt
from . import db, ma, log_print


def try_sql_commit():
    try:
        db.session.commit()
        return True
    except SQLAlchemyError:
        log_print("SQLAlchemyError! Rolling back db...")
        db.session.rollback()
        return False


######################
# History Context / Status
######################

history_context_basic = ["Error", "BBS", "Sticky", "Plenary"]
history_context_name = {}
history_context_int = {}
all_queue_rooms = []


def is_context_basic(name):
    is_basic = name in history_context_basic
    return is_basic


def get_active_room_labels():
    room_labels = Label.query.filter(Label.is_room).all()
    rooms_only = [label for label in room_labels if not is_context_basic(label.name)]
    return rooms_only


def init_history_context_tables():
    history_context_name.clear()
    history_context_int.clear()


def append_history_context_tables(room_name, room_int):
    history_context_int[room_name] = room_int
    history_context_name[room_int] = room_name


def fill_history_context_tables_and_room_list():
    global all_queue_rooms
    init_history_context_tables()
    for room_int, room_name in enumerate(history_context_basic):
        append_history_context_tables(room_name, room_int)
    room_labels = get_active_room_labels()
    all_queue_rooms = []  # empty array (global)
    for room_label in room_labels:
        room_name = room_label.name
        room_int = room_label.id + 1000  # prevent collision with history_context_basic
        all_queue_rooms.append(room_name)
        append_history_context_tables(room_name, room_int)
    all_queue_rooms.sort()  # alphabetical
    # put Plenary at start of the list, even if that all there is:
    all_queue_rooms = ["Plenary"] + all_queue_rooms
    log_print(f"all_queue_rooms: {all_queue_rooms}")
    log_print(f"room table: {history_context_int}")


def context_str_to_enum(str):
    if str in history_context_int:
        return history_context_int[str]
    return 0  # Error


def context_enum_to_str(n):
    if n in history_context_name:
        return history_context_name[n]
    return "Error"


class HistoryStatus(IntEnum):
    Tabled = 0
    Reject = 1
    Conference = 2
    Journal = 3


def status_str_to_enum(str):
    if hasattr(HistoryStatus, str):
        return int(HistoryStatus[str])
    return 0  # default is Tabled


def status_enum_to_str(n):
    for entry in HistoryStatus:
        # log_print(entry.name, entry.value)
        if entry.value == n:
            return entry.name
    return "Tabled"  # default


######################
# Many-to-Many Tables
######################

# many-many: strongly encouraged to use Table rather than Class
# https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/#many-to-many-relationships
# Also in Flask book Ch. 12. Maybe omit primary_key.

conflicts = db.Table(
    "conflicts",
    db.Column("user_id", db.Integer, db.ForeignKey("users.id")),
    db.Column("paper_id", db.Integer, db.ForeignKey("papers.id")),
)

tags = db.Table(
    "tags",
    db.Column("label_id", db.Integer, db.ForeignKey("labels.id")),
    db.Column("paper_id", db.Integer, db.ForeignKey("papers.id")),
)

######################
# Regular Tables/Classes
######################


class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True)
    users = db.relationship("User", backref="role", lazy="dynamic")

    @hybrid_property
    def is_super(self):
        if self.name == "Super":
            return True
        return False

    @hybrid_property
    def is_admin(self):
        if self.name == "Super":
            return True
        if self.name == "Admin":
            return True
        return False

    @hybrid_property
    def is_screen(self):
        if self.name == "Screen":
            return True
        return False

    def __repr__(self):
        return "<Role %r>" % self.name


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(64), unique=True, index=True)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    full_name = column_property(first_name + " " + last_name)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"))
    password_hash = db.Column(db.String(128))
    room_name = db.Column(db.String(32), default="Plenary")  # like: Room_1A
    rooms = db.Column(db.String(256))  # string of assigned rooms sep by spaces
    # role is a backref from Role
    # conf_papers is a backref from papers

    @hybrid_property
    def role_name(self):
        if self.role:
            return self.role.name
        else:
            return ""

    @hybrid_property
    def role_is_super(self):
        if not self.role:
            return False
        return self.role.is_super

    @hybrid_property
    def role_is_admin(self):
        if not self.role:
            return False
        return self.role.is_admin

    @hybrid_property
    def role_is_screen(self):
        if not self.role:
            return False
        return self.role.is_screen

    @property
    def password(self):
        raise AttributeError("password is not a readable attribute")

    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(
            password, method="pbkdf2:sha256:1000"
        )

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_token(self, expire_in_secs=0):
        if not expire_in_secs:
            # expire_in_secs = 10  # for debugging
            expire_in_secs = 7 * 24 * 60 * 60  # default one week
        expire_in_secs += int(time())  # time from now
        data = {"user_id": self.id, "exp": expire_in_secs}
        key = current_app.config["SECRET_KEY"]
        token = jwt.encode(data, key, algorithm="HS256")
        return token

    @staticmethod
    def user_from_token(token):
        if not token:
            return None
        try:
            key = current_app.config["SECRET_KEY"]
            data = jwt.decode(token, key, algorithms=["HS256"])
            user_id = data["user_id"]
            user = db.session.get(User, user_id)
            return user
        except jwt.PyJWTError:
            return None

    def __repr__(self):
        return "<User %r>" % self.full_name


# initially: Submission ID,Thumbnail URL,Title,Abstract
class Paper(db.Model):
    __tablename__ = "papers"
    id = db.Column(db.Integer, primary_key=True)
    nid = db.Column(db.Integer, unique=True, index=True)  # numeric
    sid = db.Column(db.String(64), unique=True, index=True)  # string
    oid = db.Column(db.String(64), unique=True)  # obfuscated
    key = db.Column(db.String(64), unique=True)  # decryption
    sort_score = db.Column(db.Float, default=0.0)
    queue_id = db.Column(db.Integer, db.ForeignKey("glob_queues.id"))
    queue_order = db.Column(db.Integer, default=0)
    thumbnail = db.Column(db.String(256))
    title = db.Column(db.String())
    abstract = db.Column(db.String())
    all_scores = db.Column(db.String(256))
    journal_only = db.Column(db.Boolean, default=False)
    conf_users = db.relationship(
        "User",
        secondary=conflicts,
        lazy="dynamic",
        order_by="(User.last_name,User.first_name)",
        backref=db.backref("conf_papers", lazy="dynamic"),
    )
    tag_labels = db.relationship(
        "Label",
        secondary=tags,
        lazy="dynamic",
        order_by="Label.name",
        backref=db.backref("tag_papers", lazy="dynamic"),
    )
    history = db.relationship(
        "History", backref="paper", lazy="dynamic", order_by="History.id"
    )

    def __repr__(self):
        return "<Paper %r>" % self.nid


# Submission ID,DateTime,Status
class History(db.Model):
    __tablename__ = "history"
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey("papers.id"))
    when = db.Column(db.DateTime, server_default=func.now())
    context_enum = db.Column(db.Integer)
    status_enum = db.Column(db.Integer)

    @hybrid_property
    def context(self):
        return context_enum_to_str(self.context_enum)

    @hybrid_property
    def status(self):
        return HistoryStatus(self.status_enum).name


class LabelType(IntEnum):
    Area = 0
    Cluster = 1
    Room = 2
    Tag = 3


def label_str_to_enum(str):
    if hasattr(LabelType, str):
        return int(LabelType[str])
    return 0  # default is Area


def label_enum_to_str(n):
    for entry in LabelType:
        # log_print(entry.name, entry.value)
        if entry.value == n:
            return entry.name
    return "Area"  # default


# currently handles areas and clusters, but may add more types later
class Label(db.Model):
    __tablename__ = "labels"
    id = db.Column(db.Integer, primary_key=True)
    type_enum = db.Column(db.Integer)
    name = db.Column(db.String(64))
    # tag_papers set by backref from papers

    @hybrid_property
    def label_type(self):
        return LabelType(self.type_enum).name

    @hybrid_property
    def is_cluster(self):
        return self.type_enum == int(LabelType.Cluster)

    @hybrid_property
    def is_area(self):
        return self.type_enum == int(LabelType.Area)

    @hybrid_property
    def is_room(self):
        return self.type_enum == int(LabelType.Room)

    def __repr__(self):
        return "<Label %r>" % self.name


class GlobQueue(db.Model):
    __tablename__ = "glob_queues"
    id = db.Column(db.Integer, primary_key=True)
    room = db.Column(db.String(32), unique=True)
    bar = db.Column(db.Float, default=0.0)
    hide_queue = db.Column(db.Boolean, default=False)
    message = db.Column(db.String(), default="")
    current = db.Column(db.Integer, default=-1)  # 0-base index into queue
    current_show = db.Column(db.Boolean, default=False)
    current_start = db.Column(db.DateTime, server_default=func.now())
    current_show_enter = db.Column(
        db.Integer, default=0
    )  # show enter and leave conflict lists
    called_users = db.Column(db.Boolean, default=False)


class FileUpload(db.Model):
    __tablename__ = "file_uploads"
    id = db.Column(db.Integer, primary_key=True)
    file = db.Column(db.String(64))
    count = db.Column(db.Integer, default=0)
    when = db.Column(db.DateTime, server_default=func.now())


class Filter(db.Model):
    __tablename__ = "filters"
    id = db.Column(db.Integer, primary_key=True)
    is_gui = db.Column(db.Boolean, default=True)
    name = db.Column(db.String(64), unique=True, index=True)
    text = db.Column(db.String(), default="")


class Action(db.Model):
    __tablename__ = "actions"
    id = db.Column(db.Integer, primary_key=True)
    when = db.Column(db.DateTime, server_default=func.now())
    email = db.Column(db.String(64))  # email of admin who sent this action
    func_name = db.Column(db.String(64))
    args_json = db.Column(db.String(), default="")


######################
# Marshmallo schemas
######################


class UserSchema(ma.Schema):
    class Meta:
        fields = (
            "email",
            "full_name",
            "role_name",
            "role_is_admin",
            "rooms",
            "room_name",
        )


class PaperSchema(ma.Schema):
    class Meta:
        fields = (
            "nid",
            "sid",
            "oid",
            "sort_score",
            "all_scores",
            "queue_order",
            "journal_only",
            "thumbnail",
            "title",
            "abstract",
            "summary",
        )


class HistorySchema(ma.Schema):
    class Meta:
        fields = ("when", "context", "status")


class FileUploadSchema(ma.Schema):
    class Meta:
        fields = ("file", "count", "when")


class GlobQueueSchema(ma.Schema):
    class Meta:
        fields = (
            "room",
            "bar",
            "hide_queue",
            "message",
            "current",
            "current_show",
            "current_start",
            "current_show_enter",
            "called_users",
        )


# Currently unused. Could possibly be made useful by
# adding a virtual field (function) to the model that
# returns json.loads(filter.text) if is_gui.
#
# class FilterSchema(ma.Schema):
#     class Meta:
#         fields = ("name", "is_gui", "text")


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
    gq.bar = 0
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


def ensure_user(email, first_name, last_name, role_name, passwd):
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
        db.session.add(user)


def get_all_rooms():
    if not all_queue_rooms:
        fill_history_context_tables_and_room_list()
    return all_queue_rooms


def ensure_all_gqs():
    rooms = get_all_rooms()
    for room in rooms:
        get_or_create_gq(room)


def reset_all_gqs():
    rooms = get_all_rooms()
    for room in rooms:
        reset_gq(room)


def ensure_admin():
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
    rooms = get_all_rooms()
    for room in rooms:
        lower = room.lower()
        email = f"screen.{lower}@example.com"
        ensure_user(email, "Screen", room, "Screen", passwd)


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
