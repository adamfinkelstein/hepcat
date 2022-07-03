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
# History Contexts
######################

class HistoryContext(IntEnum):
    BBS = 0
    Sticky = 1
    Plenary = 2
    length = 3

# int(HistoryContext.Plenary)
# 2
#
# for i in range(HistoryContext.length):
#     print(i,HistoryContext(i).name)
# 0 BBS
# 1 Sticky
# 2 Plenary
#
# name = 'Sticky'
# print(int(HistoryContext[name]))

# many-many: strongly encouraged to use Table rather than Class
# https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/#many-to-many-relationships
# Also in Flask book Ch. 12. Maybe omit primary_key.
conflicts = db.Table( 'conflicts',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id') ),
    db.Column('paper_id', db.Integer, db.ForeignKey('papers.id') ) )
# Some online examples indicate primary_key, like this:
#    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
#    db.Column('paper_id', db.Integer, db.ForeignKey('papers.id'), primary_key=True) )

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

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'

    def __repr__(self):
        return '<User %r>' % self.email

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# initially: Submission ID,Thumbnail URL,Title,Abstract
class Paper(db.Model):
    __tablename__ = 'papers'
    id = db.Column(db.Integer, primary_key=True)
    nid = db.Column(db.Integer, unique=True, index=True)
    sid = db.Column(db.String(64), unique=True, index=True)
    thumbnail = db.Column(db.String(256))
    title = db.Column(db.String())
    abstract = db.Column(db.String())
    summary = db.Column(db.String())
    all_scores = db.Column(db.String(64))
    reviews = db.relationship('Review', backref='paper', lazy='dynamic')
    conf_users = db.relationship('User', secondary=conflicts, lazy='dynamic', 
        order_by='(User.last_name,User.first_name)',
        backref=db.backref('conf_papers', lazy='dynamic'))
    history = db.relationship('History', backref='paper', lazy='dynamic', 
        order_by='History.when')

    # old ref
    # conf_papers = db.relationship('Paper', secondary=conflicts, lazy='dynamic', order_by='Paper.nid')
    # conf_papers = db.relationship('Paper', secondary=conflicts, lazy='dynamic',
    #     backref=db.backref('conf_users', lazy='dynamic'))


# Submission ID,Role,Rating,Consensus Recommendation
class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id'))
    role = db.Column(db.Integer)
    rating = db.Column(db.Integer)
    consensus = db.Column(db.Integer)

# Submission ID,DateTime,Status
class History(db.Model):
    __tablename__ = 'history'
    id = db.Column(db.Integer, primary_key=True)
    paper_id = db.Column(db.Integer, db.ForeignKey('papers.id'))
    when = db.Column(db.DateTime, server_default=func.now())
    context = db.Column(db.Integer)
    status = db.Column(db.String(16))

    @hybrid_property
    def context_str(self):
        return HistoryContext(self.context).name


# def kill_db_for_debug():
#     # conflicts.drop(db.engine)
#     # History.__table__.drop(db.engine)
#     # Review.__table__.drop(db.engine)
#     # Paper.__table__.drop(db.engine)
#     # User.__table__.drop(db.engine)
#     # Role.__table__.drop(db.engine)
#     with db.engine.connect() as con:
#         con.execute('DROP TABLE IF EXISTS conflicts;')


######################
# Marshmallo schemas
######################

class UserSchema(ma.Schema):
    class Meta:
        fields = ("id", "email", "first_name", "last_name")

class PaperSchema(ma.Schema):
    class Meta:
        fields = ("id", "nid", "sid", "thumbnail", "title", "abstract", "summary")

class HistorySchema(ma.Schema):
    class Meta:
        fields = ("paper_id", "when", "context", "context_str", "status")

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
    db.session.commit() # possibly not needed but probably no harm

def ensure_admin():
    # Add Admin User
    email = get_config_or_default('HEPCAT_ADMIN_LOGIN', 'hepcat.mail@gmail.com')
    passwd = get_config_or_default('HEPCAT_ADMIN_PASSWD', 'pass')
    ensure_user(email, 'Admin', 'User', 'Admin', passwd)
    # Add Test Users
    email = get_config_or_default('HEPCAT_TEST1_LOGIN', 'af@princeton.edu')
    passwd = get_config_or_default('HEPCAT_TEST1_PASSWD', 'pass')
    ensure_user(email, 'Test1', 'User1', 'Test', passwd)
    email = get_config_or_default('HEPCAT_TEST2_LOGIN', 'bonat@princeton.edu')
    passwd = get_config_or_default('HEPCAT_TEST2_PASSWD', 'pass')
    ensure_user(email, 'Test2', 'User2', 'Test', passwd)
