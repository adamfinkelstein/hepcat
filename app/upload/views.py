import os
import csv
from datetime import datetime, timedelta

from flask import render_template, flash, redirect, url_for, current_app
from flask_login import current_user
from werkzeug.utils import secure_filename
from sqlalchemy import func
from . import upload
from .forms import UploadForm
from .. import db
from ..models import User, Paper, Review, History, HistoryContext, Label, FileUpload, sid_to_num, get_or_insert_role, ensure_admin, conflicts, tags

def dump_users_papers_and_conflicts(title):
    ### ??? Later: return here if not in special mode for debugging uploads
    num_users = User.query.count()
    num_papers = Paper.query.count()
    num_reviews = Review.query.count()
    num_history = History.query.count()
    num_labels = Label.query.count()
    num_conf = db.session.query(conflicts).count()
    num_tags = db.session.query(tags).count()
    result  = f'{title}: Users={num_users}. Papers={num_papers}. Conflicts={num_conf}.'
    result += f' Reviews={num_reviews}. History={num_history}. Labels={num_labels}.'
    result += f' Tags={num_tags}.'
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

#### ????
def delete_all_clusters():
    return

def delete_all_labels():
    dump_users_papers_and_conflicts('Before label deletion')
    labels = Label.query.all()
    for label in labels:
        label.tag_papers = [] # empty list
        db.session.add(label)
    db.session.commit()
    num_deleted = Label.query.delete()
    db.session.commit()
    print(f'deleted {num_deleted} labels')
    dump_users_papers_and_conflicts('After label deletion')

def delete_all_users():
    delete_all_conflicts() # need to delete conflicts before users
    dump_users_papers_and_conflicts('Before user deletion')
    num_deleted = User.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} users.')
    dump_users_papers_and_conflicts('After user deletion')

def delete_all_papers():
    delete_all_reviews() # need to delete reviews before papers
    delete_all_history() # need to delete history before papers
    delete_all_conflicts() # need to delete conflicts before papers
    delete_all_labels() # need to delete labels before papers
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

def delete_all_history():
    num_deleted = History.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} history entries.')

def delete_all_summaries():
    papers = Paper.query.all()
    count = len(papers)
    for paper in papers:
        paper.summary = ''
        db.session.add(paper)
    db.session.commit()
    print(f'Deleted {count} summaries.')

# Email,First Name,Last Name,Role,Password
def insert_user_rows(rows):
    delete_all_users()
    ensure_admin()
    dump_users_papers_and_conflicts('After ensure')
    count = 0
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
        count += 1
    db.session.commit()
    dump_users_papers_and_conflicts('After insertion')
    return count

# Submission ID,Thumbnail URL,Title,Area,Abstract
def insert_paper_rows(rows):
    delete_all_papers()
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        sid,thumbnail,title,areas,abstract = row
        nid = sid_to_num(sid)
        paper = Paper(nid=nid, 
                    sid=sid,
                    thumbnail=thumbnail,
                    title=title,
                    abstract=abstract)
        db.session.add(paper)
        count += 1
        label_names = areas_to_labels(areas)
        for label_name in label_names:
            label = Label.query.filter_by(name=label_name).first()
            if not label:
                label = Label(name=label_name)
                db.session.add(label)
            if label and paper:
                paper.tag_labels.append(label)
                db.session.add(paper)
    db.session.commit()
    return count

# Submission ID,Email
def insert_conflict_rows(rows):
    delete_all_conflicts()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,email = row
        user = User.query.filter_by(email=email).first()
        paper = Paper.query.filter_by(sid=sid).first()
        if user and paper:
            user.conf_papers.append(paper)
            db.session.add(user)
            count += 1
    db.session.commit()
    return count

# Submission ID,Summary
def insert_summary_rows(rows):
    delete_all_summaries()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,summary = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            paper.summary = summary
            db.session.add(paper)
            count += 1
    db.session.commit()
    return count

# Submission ID,Cluster
def insert_cluster_rows(rows):
    delete_all_clusters() ####????? currently does nothing
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,cluster = row
        label_name = cluster_to_label(cluster)
        paper = Paper.query.filter_by(sid=sid).first()
        label = Label.query.filter_by(name=label_name).first()
        if not label:
            label = Label(name=label_name)
            db.session.add(label)
        if label and paper:
            paper.tag_labels.append(label)
            db.session.add(paper)
            count += 1
    db.session.commit()
    return count

def cluster_to_label(cluster):
    return f'Cluster-{cluster}'

def area_to_label(area):
    return f'Area-{area}'

def areas_to_labels(areas_string):
    areas = areas_string.split('/')
    labels = [area_to_label(area) for area in areas]
    return labels

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

def consensus_num_to_str(num):
    if num < 0:
        return 'R'
    elif num == 0:
        return 'T'
    else:
        return 'C' # should be C or J!!! but how to know?!?

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
    now = datetime.now()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        sid,role,rating,consensus = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            # add review
            role_num = review_role_to_num(role)
            rating = review_str_to_num(rating)
            consensus = review_str_to_num(consensus)
            review = Review(paper=paper,
                            role=role_num,
                            rating=rating,
                            consensus=consensus)
            db.session.add(review)
            count += 1

            # add history
            then = now - timedelta(days = 7) # a week ago
            context_enum = int(HistoryContext.BBS)
            status = consensus_num_to_str(consensus)
            history = History(paper=paper,
                            when=then,
                            context_enum=context_enum,
                            status=status)
            db.session.add(history)

    db.session.commit()
    papers_set_all_scores_and_status_from_reviews()
    return count

# Submission ID,Seconds,Context,Status
def insert_history_rows(rows):
    delete_all_history()
    now = datetime.now()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        sid,secs,context,status = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            then = now - timedelta(seconds = int(secs))
            context_enum = int(HistoryContext[context])
            history = History(paper=paper,
                            when=then,
                            context_enum=context_enum,
                            status=status)
            db.session.add(history)
            count += 1
    db.session.commit()
    return count

csvLinklings = {
    'users' : 'users.csv',
    'papers' : 'abstracts.csv',
    'conflicts' : 'conflicts.csv',
    'clusters' : 'clusters.csv',
    'reviews' : 'status.csv',
    'summaries' : 'commitee_notes.csv',
    'history' : 'n/a' }

csvTypes = {
    'users' : 'Email,First Name,Last Name,Role,Password',
    'papers' : 'Submission ID,Thumbnail URL,Title,Area,Abstract',
    'conflicts' : 'Submission ID,Email',
    'clusters' : 'Submission ID,Cluster',
    'reviews' : 'Submission ID,Role,Rating,Consensus Recommendation',
    'summaries' : 'Submission ID,Summary',
    'history' : 'Submission ID,Seconds,Context,Status' }

csvFunctions = {
    'users' : insert_user_rows,
    'papers' : insert_paper_rows,
    'conflicts' : insert_conflict_rows,
    'clusters' : insert_cluster_rows,
    'reviews' : insert_review_rows,
    'summaries' : insert_summary_rows,
    'history' : insert_history_rows }

csvDependence = {
    'users' : ['conflicts'],
    'papers' : ['reviews', 'conflicts', 'history', 'clusters', 'summaries'] }

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

def delete_prev_file_uploads(headerType):
    FileUpload.query.filter_by(file=headerType).delete()
    if headerType in csvDependence:
        deps = csvDependence[headerType]
        for dep in deps:
            FileUpload.query.filter_by(file=dep).delete()

def read_csv(filename):
    header, rows = read_csv_rows(filename)
    headerType = get_csv_type(header)
    if headerType in csvFunctions:
        func = csvFunctions[headerType]
        if not func:
            return False, False
        count = func(rows)
        delete_prev_file_uploads(headerType)
        upload = FileUpload(file=headerType, count=count, user_id=current_user.id)
        db.session.add(upload)
        db.session.commit()
        msg = dump_users_papers_and_conflicts('After Upload')
        if headerType == 'users':
            msg += ' You have been logged out because users were updated.'
            return msg, True
        return msg, False
    return False, False

def pending_uploads(uploads):
    already = [upload.file for upload in uploads]
    keys = list(csvTypes.keys())
    pending = [key for key in keys if key not in already]
    # print(already, keys, pending)
    return pending

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
    uploads = FileUpload.query.all()
    pending = pending_uploads(uploads)
    return render_template('upload.html', form=form, filename=filename, uploads=uploads, pending=pending, linklings=csvLinklings)


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