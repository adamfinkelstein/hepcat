from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from flask import current_app
from flask_login import UserMixin
from . import db, login_manager

# many-many: strongly encouraged to use Table rather than Class
# https://flask-sqlalchemy.palletsprojects.com/en/2.x/models/#many-to-many-relationships
# Also in Flask book Ch. 12. Maybe omit primary_key.
conflicts = db.Table( 'conflicts',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id') ),
    db.Column('paper_id', db.Integer, db.ForeignKey('papers.id') ) )
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
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'))
    password_hash = db.Column(db.String(128))
    confirmed = db.Column(db.Boolean, default=False)
    conf_papers = db.relationship('Paper', secondary=conflicts, lazy='dynamic',
        backref=db.backref('conf_users', lazy='dynamic'))

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
        return '<User %r>' % self.email


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# initially: Submission ID,Thumbnail URL,Title,Abstract
class Paper(db.Model):
    __tablename__ = 'papers'
    id = db.Column(db.Integer, primary_key=True)
    sid = db.Column(db.String(64), unique=True, index=True)
    thumbnail = db.Column(db.String(256))
    title = db.Column(db.String())
    abstract = db.Column(db.String())
    summary = db.Column(db.String())
    all_scores = db.Column(db.String(64))

def sidToNum(pid):
    n = pid.replace('papers_','')
    return int(n)

def numToSid(n):
    sid = f'papers_{n}'
    return sid

def getOrInsertRole(role):
    roleObj = Role.query.filter_by(name=role).first()
    if not roleObj:
        roleObj = Role(name=role)
        db.session.add(roleObj)
    return roleObj

def ensureAdmin():
    adminName = 'Admin'
    adminRole = getOrInsertRole(adminName)
    app = current_app._get_current_object()
    adminLogin = app.config['HEPCAT_ADMIN_LOGIN']
    admin = User.query.filter_by(email=adminLogin).first()
    if not admin:
        adminPasswd = app.config['HEPCAT_ADMIN_PASSWD']
        admin = User(email=adminLogin,
                        first_name='Admin',
                        last_name='User',
                        role=adminRole,
                        password=adminPasswd,
                        confirmed=True)
        db.session.add(admin)
    db.session.commit() # possibly not needed but probably no harm
