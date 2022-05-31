from flask import render_template, flash, current_app
from . import upload
from werkzeug import secure_filename
from .forms import UploadForm
from .. import db
from ..models import User

import os
import csv

# Email,First Name,Last Name,Role,Password
def createUsers(rows):
    for row in rows:
        if len(row) < 5:
            continue
        email,first_name,last_name,role,password = row
        user = User(email=email,
                    first_name=first_name,
                    last_name=last_name,
                    # role=role, # need to look this up
                    password=password)
        db.session.add(user)
    db.session.commit()

csvTypes = {
    'users' : 'Email,First Name,Last Name,Role,Password',
    'papers' : 'Submission ID,Thumbnail URL,Title,Abstract',
    'conflicts' : 'Submission ID,Email',
    'clusters' : 'Submission ID,Cluster',
    'reviews' : 'Submission ID,Role,Rating,Consensus Recommendation',
    'summaries' : 'Submission ID,Summary' }

def isCSV(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext == 'csv'

def makePathIfNeeded(path):
    if not os.path.exists(path):
        os.makedirs(path)

def readCSVRows(filename):
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

def getCSVType(header):
    for t in csvTypes:
        typeHeader = csvTypes[t]
        if header.lower() == typeHeader.lower():
            return t
    return None

def readCSV(filename):
    header, rows = readCSVRows(filename)
    headerType = getCSVType(header)
    if headerType != 'users':
        return False
    createUsers(rows)
    return True

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
@upload.route('/upload/', methods=('GET', 'POST'))
def upload():
    form = UploadForm()
    filename = None
    if form.validate_on_submit():
        file = form.file.data
        filename = secure_filename(file.filename)
        if not isCSV(filename):
            filename = None
            flash('Uploaded file is not CSV, ignored.')
        else:
            app = current_app._get_current_object()
            folder = app.config['UPLOAD_FOLDER']
            makePathIfNeeded(folder)
            fullpath = os.path.join(folder, filename)
            file.save(fullpath)
            flash('saved csv file here: '+fullpath)
            ok = readCSV(fullpath)
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