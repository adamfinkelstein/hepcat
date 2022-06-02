from flask import render_template, flash, current_app
from . import upload
from werkzeug import secure_filename
from .forms import UploadForm
from .. import db
from ..models import Role, User, Paper, get_or_insert_role, ensure_admin, conflicts
from sqlalchemy import func

import os
import csv

def dump_users_papers_and_conflicts(title):
    num_users = User.query.count()
    num_papers = Paper.query.count()
    num_conf = db.session.query(conflicts).count()
    print(f'{title}: U {num_users} P {num_papers} C {num_conf}.')

def delete_all_conflicts():
    dump_users_papers_and_conflicts('Before conflict deletion')
    users = User.query.all()
    for user in users:
        user.conf_papers = [] # empty list
        db.session.add(user)
    db.session.commit()    
    dump_users_papers_and_conflicts('After conflict deletion')
    
def delete_all_users():
    delete_all_conflicts() # need to delete conflicts before users
    dump_users_papers_and_conflicts('Before user deletion')
    num_deleted = User.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} users.')
    dump_users_papers_and_conflicts('After user deletion')

def delete_all_papers():
    delete_all_conflicts() # need to delete conflicts before papers
    dump_users_papers_and_conflicts('Before paper deletion')
    num_deleted = Paper.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} papers.')
    dump_users_papers_and_conflicts('After paper deletion')

# Email,First Name,Last Name,Role,Password
def insert_user_rows(rows):
    delete_all_users()
    ensure_admin()
    dump_users_papers_and_conflicts('After ensure')
    for row in rows:
        if len(row) < 5:
            continue
        email,first_name,last_name,role,password = row
        user = User(email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password)
        if len(role):
            roleObj = get_or_insert_role(role)
            user.role = roleObj
        db.session.add(user)
    db.session.commit()
    dump_users_papers_and_conflicts('After insertion')

# Submission ID,Thumbnail URL,Title,Abstract
def insert_paper_rows(rows):
    delete_all_papers()
    for row in rows:
        if len(row) < 4:
            continue
        sid,thumbnail,title,abstract = row
        paper = Paper(sid=sid,
                    thumbnail=thumbnail,
                    title=title,
                    abstract=abstract)
        db.session.add(paper)
    db.session.commit()

# Submission ID,Email
def insert_conflict_rows(rows):
    delete_all_conflicts()
    for row in rows:
        if len(row) < 2:
            continue
        sid,email = row
        user = User.query.filter_by(email=email).first()
        paper = Paper.query.filter_by(sid=sid).first()
        if user and paper:
            user.conf_papers.append(paper)
        db.session.add(user)
    db.session.commit()

csvTypes = {
    'users' : 'Email,First Name,Last Name,Role,Password',
    'papers' : 'Submission ID,Thumbnail URL,Title,Abstract',
    'conflicts' : 'Submission ID,Email',
    'clusters' : 'Submission ID,Cluster',
    'reviews' : 'Submission ID,Role,Rating,Consensus Recommendation',
    'summaries' : 'Submission ID,Summary' }

csvFunctions = {
    'users' : insert_user_rows,
    'papers' : insert_paper_rows,
    'conflicts' : insert_conflict_rows,
    'clusters' : None,
    'reviews' : None,
    'summaries' : None }

def is_csv(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext == 'csv'

def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)

def read_csv_rows(filename):
    with open(filename) as f:
        csvReader = csv.reader(f)
        rows = []
        for row in csvReader:
            rows.append(row)
    if len(rows) < 1:
        return None, None
    header = rows[0]
    header = ','.join(header)
    rows = rows[1:]
    return header, rows

def get_csv_type(header):
    for t in csvTypes:
        typeHeader = csvTypes[t]
        if header.lower() == typeHeader.lower():
            return t
    return None

def read_csv(filename):
    header, rows = read_csv_rows(filename)
    headerType = get_csv_type(header)
    if headerType in csvFunctions:
        func = csvFunctions[headerType]
        func(rows)
        return True
    return False

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
@upload.route('/upload/', methods=('GET', 'POST'))
def upload():
    form = UploadForm()
    filename = None
    if form.validate_on_submit():
        file = form.file.data
        filename = secure_filename(file.filename)
        if not is_csv(filename):
            filename = None
            flash('Uploaded file is not CSV, ignored.')
        else:
            app = current_app._get_current_object()
            folder = app.config['UPLOAD_FOLDER']
            make_path_if_needed(folder)
            fullpath = os.path.join(folder, filename)
            file.save(fullpath)
            flash('saved csv file here: '+fullpath)
            ok = read_csv(fullpath)
            if ok:
                flash('read csv file: ' + fullpath)
            else:
                flash('unable to read csv file: ' + fullpath)
    return render_template('upload.html', form=form, filename=filename)


''' Should follow redirect model, like this:
@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(email=form.email.data.lower(),
                    first_name=form.first_name.data, #now outdated
                    password=form.password.data)
        db.session.add(user)
        db.session.commit()
        token = user.generate_confirmation_token()
        send_email(user.email, 'Confirm Your Account',
                   'auth/email/confirm', user=user, token=token)
        flash('A confirmation email has been sent to you by email.')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html', form=form)
'''