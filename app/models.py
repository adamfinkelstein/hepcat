from enum import IntEnum
from werkzeug.security import generate_password_hash, check_password_hash

# from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from flask import current_app
from flask_login import UserMixin
from sqlalchemy.orm import column_property
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import func
from . import db, ma


def try_sql_commit():
    try:
        db.session.commit()
        return True
    except SQLAlchemyError:
        print("SQLAlchemyError! Rolling back db...")
        db.session.rollback()
        return False


######################
# History Context / Status
######################


class HistoryContext(IntEnum):
    BBS = 0
    Stickie = 1
    Plenary = 2
    Room_A = 3
    Room_B = 4
    Room_X = 5
    Room_Y = 6


class HistoryStatus(IntEnum):
    Tabled = 0
    Reject = 1
    Conference = 2
    Journal = 3


def context_str_to_enum(str):
    if hasattr(HistoryContext, str):
        return int(HistoryContext[str])
    return 0


def context_enum_to_str(n):
    for entry in HistoryContext:
        # print(entry.name, entry.value)
        if entry.value == n:
            return entry.name
    return "BBS"  # default


def status_str_to_enum(str):
    if hasattr(HistoryStatus, str):
        return int(HistoryStatus[str])
    return 0  # default is Tabled


def status_enum_to_str(n):
    for entry in HistoryStatus:
        # print(entry.name, entry.value)
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


class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(64), unique=True, index=True)
    login_token = db.Column(db.String(64), unique=True, index=True)  # unused
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    full_name = column_property(first_name + " " + last_name)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"))
    password_hash = db.Column(db.String(128))
    confirmed = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime)
    # the three columns below should be made more consistent
    # (maybe could be achieved with column property like full_name)
    last_seen_in = db.Column(db.String(8))  # like Room_A
    rooms = db.Column(db.String(4))  # 2 char like: AX
    in_room = db.Column(db.String(4))  # 1 char like: A
    # role is a backref from Role
    # conf_papers is a backref from papers

    @hybrid_property
    def role_name(self):
        if self.role:
            return self.role.name
        else:
            return ""

    @hybrid_property
    def room_name(self):
        if not self.in_room or self.in_room == "P":
            return "Plenary"
        else:
            return "Room_" + self.in_room

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
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    # appears to be unused! might be used for email confirmations.
    # def generate_confirmation_token(self, expiration=3600):
    #     s = Serializer(current_app.config['SECRET_KEY'], expiration)
    #     return s.dumps({'confirm': self.id}).decode('utf-8')

    # def confirm(self, token):
    #     s = Serializer(current_app.config['SECRET_KEY'])
    #     try:
    #         data = s.loads(token.encode('utf-8'))
    #     except:
    #         return False
    #     if data.get('confirm') != self.id:
    #         return False
    #     self.confirmed = True
    #     db.session.add(self)
    #     return True

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
    summary = db.Column(db.String())  # probably no longer used XXXX
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
        "History", backref="paper", lazy="dynamic", order_by="History.when"
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
        return HistoryContext(self.context_enum).name

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
        # print(entry.name, entry.value)
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
    room = db.Column(db.String(8), unique=True)
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


class Query(db.Model):
    __tablename__ = "queries"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, index=True)
    json = db.Column(db.String(), default="")


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
            "last_seen",
            "last_seen_in",
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


class QuerySchema(ma.Schema):
    class Meta:
        fields = ("name", "json")


######################
# Global queue vars
######################

all_queue_rooms = "Plenary,Room_A,Room_B,Room_X,Room_Y".split(",")


def get_or_create_gq(room):
    gq = GlobQueue.query.filter_by(room=room).first()
    if gq:
        # print(f'retrieved GC with room {room}')
        return gq
    called_users = room == "Plenary"
    gq = GlobQueue(room=room, called_users=called_users)
    db.session.add(gq)
    if try_sql_commit():
        print(f"created GC with room {room}")
    else:
        print("failed to create GC")
        gq = None
    return gq


def reset_gq(room):
    gq = GlobQueue.query.filter_by(room=room).first()
    if not gq:
        gq = get_or_create_gq(room)
    gq.hide_queue = False
    gq.message = ""
    gq.current = -1
    gq.current_show = False
    db.session.add(gq)
    if try_sql_commit():
        print(f"reset GQ in room {room}")
    else:
        print(f"failed to reset GQ in room {room}")


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


def get_or_insert_role(role):
    roleObj = Role.query.filter_by(name=role).first()
    if not roleObj:
        roleObj = Role(name=role)
        db.session.add(roleObj)
    return roleObj


def get_config_or_default(key, default):
    app = current_app._get_current_object()
    if key in app.config:
        value = app.config[key]
        if value:
            return value
    return default


def insert_test_paper():
    nid = 9999
    paper = Paper.query.filter_by(nid=nid).first()
    if paper:
        return -1
    sid = num_to_sid(nid)
    oid = "test_9999"
    key = "1234567890123456"  # must be 16 characters
    thumbnail = "https://fakeimg.pl/600x450/685/f5c/?text=TEST&font_size=240&font=bebas"
    title = "Testing Conflictbot"
    abstract = "This paper should be conflicted with all users."
    paper = Paper(
        nid=nid,
        sid=sid,
        oid=oid,
        key=key,
        thumbnail=thumbnail,
        title=title,
        journal_only=False,
        abstract=abstract,
    )
    db.session.add(paper)
    users = User.query.all()
    count = 0
    for user in users:
        if user.role_is_admin or user.role_is_screen:
            continue
        user.conf_papers.append(paper)
        db.session.add(user)
        count += 1
        # print(f'9999 conflicted with {user.full_name} ({count})')
    if not try_sql_commit():
        msg = "failed to insert test paper"
        print(msg)
        return -2
    return count


def ensure_user(email, first_name, last_name, role_name, passwd):
    if not (email and first_name and last_name and role_name and passwd):
        print(
            "cannot add user with incomplete info: ",
            email,
            first_name,
            last_name,
            role_name,
            passwd,
        )
        return
    user = User.query.filter_by(email=email).first()
    if not user:
        role = get_or_insert_role(role_name)
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            password=passwd,
            confirmed=True,
        )
        db.session.add(user)
        if try_sql_commit():
            print(f"created user with email {email}")
        else:
            print(f"failed to create user with email {email}")


def ensure_all_gqs():
    for room in all_queue_rooms:
        get_or_create_gq(room)


def reset_all_gqs():
    for room in all_queue_rooms:
        reset_gq(room)


def ensure_admin():
    ensure_all_gqs()  # Also init global queue variables, if needed
    # Add Admin User
    email = get_config_or_default("HEPCAT_ADMIN_LOGIN", "admin@example.com")
    passwd = get_config_or_default("HEPCAT_ADMIN_PASSWD", "pass")
    ensure_user(email, "Admin", "User", "Super", passwd)
    email = get_config_or_default("HEPCAT_CHAIR_LOGIN", "chair@example.com")
    passwd = get_config_or_default("HEPCAT_CHAIR_PASSWD", "chair")
    ensure_user(email, "Chair", "User", "Super", passwd)
    # This code below should be moved to location of upload users...
    passwd = get_config_or_default("HEPCAT_SCREEN_PASSWD", "screen")
    ensure_user("screen.ax@example.com", "Screen", "AX", "Screen", passwd)
    ensure_user("screen.by@example.com", "Screen", "BY", "Screen", passwd)
    ensure_user("screen@example.com", "Screen", "Plenary", "Screen", passwd)


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
    print(result)
    return result


def db_is_sqlite():
    db_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
    is_sqlite = db_uri.startswith("sqlite")
    return is_sqlite


def execute_sql_cmd(cmd):
    rows = db.session.execute(db.text(cmd))
    return rows


def get_table_names():
    if db_is_sqlite():
        cmd = """SELECT name FROM sqlite_schema
WHERE type = 'table' AND name NOT LIKE 'sqlite_%';
"""
    else:
        cmd = """SELECT table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
AND table_name NOT LIKE 'alembic_%'
AND table_schema NOT IN ('pg_catalog', 'information_schema');
"""
    rows = execute_sql_cmd(cmd)
    tables = [row[0] for row in rows]
    print("all db tables: ", tables)
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
    title = f"Before dropping tables {tables_to_drop}"
    output = dump_users_papers_and_conflicts(title)
    for table in drop_list:
        if table in all_tables:
            sql_drop_table(table)
        else:
            print(f"no need to drop non-existant table {table}")
    print("having dropped tables, about to rebuild...")
    if not try_sql_commit():  # needed before create_all below
        print("try_sql_commit error")
    db.create_all()
    print("...rebuild done.")
    title = f"After dropping tables {tables_to_drop}"
    output += dump_users_papers_and_conflicts(title)
    return output


def wipe_db_clean():
    db.close_all_sessions()  # needed before drop_all below
    print("wipe_db_clean: about to drop all db tables...")
    db.drop_all()
    print("wipe_db_clean: about to create all db tables...")
    db.create_all()
