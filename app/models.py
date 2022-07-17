from enum import IntEnum
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from flask import current_app
from flask_login import UserMixin
from sqlalchemy.orm import column_property
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func
from . import db, ma, login_manager

######################
# History Context / Status
######################

class HistoryContext(IntEnum):
    BBS = 0
    Stickie = 1
    Plenary = 2

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
    return 'BBS' # default

def status_str_to_enum(str):
    if hasattr(HistoryStatus, str):
        return int(HistoryStatus[str])
    return 0 # default is Tabled

def status_enum_to_str(n):
    for entry in HistoryStatus:
        # print(entry.name, entry.value)
        if entry.value == n:
            return entry.name
    return 'Tabled' # default

######################
# Many-to-Many Tables
######################

# many-many: strongly encouraged to use Table rather than Class
# https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/#many-to-many-relationships
# Also in Flask book Ch. 12. Maybe omit primary_key.

conflicts = db.Table( 'conflicts',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id') ),
    db.Column('paper_id', db.Integer, db.ForeignKey('papers.id') ) )

tags = db.Table( 'tags',
    db.Column('label_id', db.Integer, db.ForeignKey('labels.id') ),
    db.Column('paper_id', db.Integer, db.ForeignKey('papers.id') ) )

######################
# Regular Tables/Classes
######################

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True)
    users = db.relationship('User', backref='role', lazy='dynamic')

    def __repr__(self):
        return '<Role %r>' % self.name

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(64), unique=True, index=True)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    full_name = column_property(first_name + " " + last_name)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
    password_hash = db.Column(db.String(128))
    confirmed = db.Column(db.Boolean, default=False)
    # role is a backref from Role
    # conf_papers is a backref from papers

    @hybrid_property
    def role_name(self):
        return self.role.name

    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')

    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_confirmation_token(self, expiration=3600):
        s = Serializer(current_app.config['SECRET_KEY'], expiration)
        return s.dumps({'confirm': self.id}).decode('utf-8')

    def confirm(self, token):
        s = Serializer(current_app.config['SECRET_KEY'])
        try:
            data = s.loads(token.encode('utf-8'))
        except:
            return False
        if data.get('confirm') != self.id:
            return False
        self.confirmed = True
        db.session.add(self)
        return True

    def __repr__(self):
        return '<User %r>' % self.full_name

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# initially: Submission ID,Thumbnail URL,Title,Abstract
class Paper(db.Model):
    __tablename__ = 'papers'
    id = db.Column(db.Integer, primary_key=True)
    nid = db.Column(db.Integer, unique=True, index=True)
    sid = db.Column(db.String(64), unique=True, index=True)
    sort_score = db.Column(db.Float, default=0.0)
    queue_order = db.Column(db.Integer, default=0)
    thumbnail = db.Column(db.String(256))
    title = db.Column(db.String())
    abstract = db.Column(db.String())
    summary = db.Column(db.String())
    all_scores = db.Column(db.String(64))
    reviews = db.relationship('Review', backref='paper', lazy='dynamic')
    conf_users = db.relationship('User', secondary=conflicts, lazy='dynamic', 
        order_by='(User.last_name,User.first_name)',
        backref=db.backref('conf_papers', lazy='dynamic'))
    tag_labels = db.relationship('Label', secondary=tags, lazy='dynamic', 
        order_by='Label.name',
        backref=db.backref('tag_papers', lazy='dynamic'))
    history = db.relationship('History', backref='paper', lazy='dynamic', 
        order_by='History.when')

# Submission ID,Role,Rating,Consensus Recommendation
class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id'))
    role = db.Column(db.Integer)
    conference = db.Column(db.Integer)
    journal = db.Column(db.Integer)
    consensus = db.Column(db.Integer) # later will be a status code????

# Submission ID,DateTime,Status
class History(db.Model):
    __tablename__ = 'history'
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id'))
    when = db.Column(db.DateTime, server_default=func.now())
    context_enum = db.Column(db.Integer)
    status_enum = db.Column(db.Integer)

    @hybrid_property
    def context(self):
        return HistoryContext(self.context_enum).name

    @hybrid_property
    def status(self):
        return HistoryStatus(self.status_enum).name

prefix_cluster = 'Cluster-'
prefix_area = 'Area-'

def cluster_to_label_name(cluster):
    return f'{prefix_cluster}{cluster}'

def area_to_label_name(area):
    return f'{prefix_area}{area}'

# currently handles areas and clusters, but may add more types later
class Label(db.Model):
    __tablename__ = 'labels'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True)
    # tag_papers set by backref from papers

    @hybrid_property
    def is_cluster(self):
        return self.name.startswith(prefix_cluster)

    @hybrid_property
    def is_area(self):
        return self.name.startswith(prefix_area)

    def __repr__(self):
        return '<Label %r>' % self.name


class GlobQueue(db.Model):
    __tablename__ = 'glob_queue'
    id = db.Column(db.Integer, primary_key=True)
    bar = db.Column(db.Float, default=0.0)
    hide_queue = db.Column(db.Boolean, default=False)
    message = db.Column(db.String(), default='')
    current = db.Column(db.Integer, default=-1) # 0-base index into queue
    current_show = db.Column(db.Boolean, default=False)
    current_start = db.Column(db.DateTime, server_default=func.now())
    current_show_enter = db.Column(db.Boolean, default=False)

class FileUpload(db.Model):
    __tablename__ = 'file_upload'
    id = db.Column(db.Integer, primary_key=True)
    file = db.Column(db.String(64))
    count = db.Column(db.Integer, default=0)
    when = db.Column(db.DateTime, server_default=func.now())
    # user_id = db.Column(db.Integer, db.ForeignKey('users.id')) AF removed this


######################
# Marshmallo schemas
######################

class UserSchema(ma.Schema):
    class Meta:
        fields = ("email", "full_name", "role_name")

class PaperSchema(ma.Schema):
    class Meta:
        fields = ("nid", "sid", "sort_score", "all_scores", "queue_order", 
                "thumbnail", "title", "abstract", "summary")

class HistorySchema(ma.Schema):
    class Meta:
        fields = ("when", "context", "status")

class GlobQueueSchema(ma.Schema):
    class Meta:
        fields = ("bar", "hide_queue", "message", 
            "current", "current_show", "current_start", "current_show_enter")

######################
# Global queue vars
######################

def ensure_gq():
    gq = GlobQueue.query.first()
    if not gq:
        gq = GlobQueue()
        db.session.add(gq)
        db.session.commit()
        print(f'created GC with id {gq.id}')
    else:
        print(f'retrieved GC with id {gq.id}')

######################
# Helper functions
######################

def sid_to_num(sid):
    n = sid.replace('papers_','')
    return int(n)

def num_to_sid(n):
    # should add leading zeros, but not needed if larger than 100
    sid = f'papers_{n}'
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

def ensure_user(email, first_name, last_name, role_name, passwd):
    if not (email and first_name and last_name and role_name and passwd):
        print('cannot add user with incomplete info: ', 
                email, first_name, last_name, role_name, passwd)
    role = get_or_insert_role(role_name)
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email,
                        first_name=first_name,
                        last_name=last_name,
                        role=role,
                        password=passwd,
                        confirmed=True)
        db.session.add(user)
    db.session.commit()

def ensure_admin():
    # Add Admin User
    email = get_config_or_default('HEPCAT_ADMIN_LOGIN', 'hepcat.mail@gmail.com')
    passwd = get_config_or_default('HEPCAT_ADMIN_PASSWD', 'pass')
    ensure_user(email, 'Admin', 'User', 'Admin', passwd)
    # Add Test Users
    email = get_config_or_default('HEPCAT_TEST1_LOGIN', 'af@princeton.edu')
    passwd = get_config_or_default('HEPCAT_TEST1_PASSWD', 'pass')
    ensure_user(email, 'Adam', 'Finkelstein', 'Admin', passwd)
    email = get_config_or_default('HEPCAT_TEST2_LOGIN', 'bonat@princeton.edu')
    passwd = get_config_or_default('HEPCAT_TEST2_PASSWD', 'pass')
    ensure_user(email, 'Baris', 'Onat', 'Admin', passwd)
    # Also init global queue variables, if needed
    ensure_gq()
