import os
import csv

from flask import render_template, flash, redirect, url_for, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import func
from . import upload
from .forms import UploadForm
from .. import db
from ..models import User, Paper, Review, sid_to_num, get_or_insert_role, ensure_admin, conflicts

def dump_users_papers_and_conflicts(title):
    num_users = User.query.count()
    num_papers = Paper.query.count()
    num_reviews = Review.query.count()
    num_conf = db.session.query(conflicts).count()
    result = f'{title}: Users={num_users}. Papers={num_papers}. Conflicts={num_conf}. Reviews={num_reviews}.'
    print(result)
    return result

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
    delete_all_reviews() # need to delete reviews before papers
    delete_all_conflicts() # need to delete conflicts before papers
    dump_users_papers_and_conflicts('Before paper deletion')
    num_deleted = Paper.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} papers.')
    dump_users_papers_and_conflicts('After paper deletion')

def delete_all_reviews():
    dump_users_papers_and_conflicts('Before review deletion')
    num_deleted = Review.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} reviews.')
    dump_users_papers_and_conflicts('After review deletion')

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
                    password=password,
                    confirmed=True)
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
        nid = sid_to_num(sid)
        paper = Paper(nid=nid, 
                    sid=sid,
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

def review_role_to_num(role):
    if 'lead' in role:
        return 1
    elif 'Committee' in role:
        return 2
    return 3

def review_str_to_num(s):
    s = s.strip()
    if len(s):
        return int(s)
    return 0

rating_codes_dict = {-5:'_R_', -3:'R', -1:'r', 1:'a', 3:'A', 5:'_A_'}

def get_rating_code(rating):
    if rating in rating_codes_dict:
        return rating_codes_dict[rating]
    return '?'

def get_consensus_code(consensus_recs):
    if len(consensus_recs) == 2 and consensus_recs[0] == consensus_recs[1]:
        if consensus_recs[0] > 0:
            return 'A'
        else:
            return 'R'
    return 'T'

def papers_set_all_scores_and_status_from_reviews():
    papers = Paper.query.all()
    for paper in papers:
        all_scores = '[ '
        consensus_recs = []
        reviews = paper.reviews.order_by(Review.role)
        for review in reviews:
            all_scores += get_rating_code(review.rating) + ' '
            if review.role >= 1 and review.role <= 2: # primary or secondary
                consensus_recs.append(review.consensus)
        all_scores += '] ' + get_consensus_code(consensus_recs)
        paper.all_scores = all_scores
        db.session.add(paper)
    db.session.commit()

# Submission ID,Role,Rating,Consensus Recommendation
def insert_review_rows(rows):
    delete_all_reviews()
    for row in rows:
        if len(row) < 4:
            continue
        sid,role,rating,consensus = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            role_num = review_role_to_num(role)
            rating = review_str_to_num(rating)
            consensus = review_str_to_num(consensus)
            review = Review(paper=paper,
                            role=role_num,
                            rating=rating,
                            consensus=consensus)
            db.session.add(review)
    db.session.commit()
    papers_set_all_scores_and_status_from_reviews()

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
    'reviews' : insert_review_rows,
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
    for typ in csvTypes:
        typeHeader = csvTypes[typ]
        if header.lower() == typeHeader.lower():
            return typ
    return None

def read_csv(filename):
    header, rows = read_csv_rows(filename)
    headerType = get_csv_type(header)
    if headerType in csvFunctions:
        func = csvFunctions[headerType]
        func(rows)
        msg = dump_users_papers_and_conflicts('After Upload')
        if headerType == 'users':
            msg += ' You have been logged out because users were updated.'
            return msg, True
        return msg, False
    return False, False

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
@upload.route('/', methods=('GET', 'POST'))
def upload():
    form = UploadForm()
    filename = None
    logout = False
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
            # flash('saved csv file here: '+fullpath)
            msg, logout = read_csv(fullpath)
            if msg:
                msg = f'Uploaded file "{filename}". ' + msg
            else:
                msg ='Unable to read csv file: ' + filename
            flash(msg)
    if logout:
        return redirect(url_for('auth.login'))
    else:
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