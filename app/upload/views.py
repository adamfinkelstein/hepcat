import os
import csv
from datetime import datetime, timedelta
from flask import render_template, flash, redirect, url_for, send_file, current_app
# from flask_login import current_user
from werkzeug.utils import secure_filename
# from sqlalchemy import func
from . import upload
from .forms import UploadForm
from .. import db
from ..models import User, Paper, Review, History, HistoryContext, HistoryStatus, Label, FileUpload, \
    sid_to_num, get_or_insert_role, ensure_admin, cluster_to_label_name, area_to_label_name, \
    context_str_to_enum, status_str_to_enum, status_enum_to_str, conflicts, tags

def dump_users_papers_and_conflicts(title):
    ### ??? Later: return here, if not in special mode for debugging uploads
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

def delete_all_clusters():
    dump_users_papers_and_conflicts('Before cluster deletion')
    papers = Paper.query.all()
    for paper in papers:
        # first remove all cluster labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_cluster]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    cluster_labels = Label.query.filter(Label.is_cluster).all()
    cluster_names = [label.name for label in list(cluster_labels)]
    for name in cluster_names:
        Label.query.filter_by(name=name).delete()
    db.session.commit()    
    dump_users_papers_and_conflicts('After cluster deletion')
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
    # see: https://stackoverflow.com/questions/3481976/ 
    num_deleted = User.query.delete() # delete(synchronize_session='fetch')
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
    delete_all_history() # need to delete history before reviews
    dump_users_papers_and_conflicts('Before review deletion')
    num_deleted = Review.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} reviews.')
    dump_users_papers_and_conflicts('After review deletion')

def delete_all_history():
    dump_users_papers_and_conflicts('Before History deletion')
    num_deleted = History.query.delete()
    db.session.commit()
    print(f'Deleted {num_deleted} history entries.')
    dump_users_papers_and_conflicts('After History deletion')

# this is before history upload, which is just for debugging
def delete_non_bbs_history():
    dump_users_papers_and_conflicts('Before non-BBS History deletion')
    context_bbs = int(HistoryContext.BBS)
    # Note that filter() allows for != (but filter_by does not allow it)
    num_deleted = History.query.filter(History.context_enum != context_bbs).delete()
    db.session.commit()
    print(f'Deleted {num_deleted} history entries.')
    dump_users_papers_and_conflicts('After non-BBS History deletion')

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

def journal_only_from_conf(conf):
    return conf != "yes"

# Submission ID,Thumbnail URL,Title,Area,Abstract
def insert_paper_rows(rows):
    delete_all_papers()
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        sid,thumbnail,title,areas,conf,abstract = row
        journal_only = journal_only_from_conf(conf)
        nid = sid_to_num(sid)
        paper = Paper(nid=nid, 
                    sid=sid,
                    thumbnail=thumbnail,
                    title=title,
                    journal_only=journal_only,
                    abstract=abstract)
        db.session.add(paper)
        count += 1
        label_names = areas_to_label_names(areas)
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
    delete_all_clusters()
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,cluster = row
        label_name = cluster_to_label_name(cluster)
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

def areas_to_label_names(areas_string):
    areas = areas_string.split('/')
    labels = [area_to_label_name(area) for area in areas]
    return labels

def review_role_to_num(role):
    if 'lead' in role:
        return 1
    elif 'Committee' in role:
        return 2
    return 3

def float_str_to_int(s):
    return int(round(float(s)))

def review_str_to_num(s):
    s = s.strip()
    if len(s):
        return float_str_to_int(s)
    return 0

rating_codes_dict = {-5:'_R_', -3:'R', -1:'r', 0:'?', 1:'a', 3:'A', 5:'_A_'}

def get_rating_code(rating):
    if rating in rating_codes_dict:
        return rating_codes_dict[rating]
    return '?'

def get_consensus_info(consensus_recs):
    # later: need to check for Conference / Journal?
    if len(consensus_recs) == 2 and consensus_recs[0] == consensus_recs[1]:
        enum = consensus_recs[0]
    else:
        enum = 0 # default is Tabled
    name = status_enum_to_str(enum)
    return enum, name

def scores_to_string(scores):
    codes = [ get_rating_code(score) for score in scores ]
    brackets = '[ ' + ' '.join(codes) + ' ]'
    return brackets

def average_scores(scores):
    n = len(scores)
    if n:
        ave = 1.0 * sum(scores) / n
        return ave
    return 0.0

def non_zero_scores(scores):
    scores = [ score for score in scores if score != 0 ]
    return scores

# before it was in papers.csv, we computed this from conf scores:
# def journal_only(conference_scores):
#     nz = non_zero_scores(conference_scores)
#     return len(nz) > 0

def weird_conf_scores(conference_scores):
    nz = len(non_zero_scores(conference_scores))
    total = len(conference_scores)
    if (nz > 0) and (total-nz) > 1:
        return True
    return False

def all_scores_to_sort_score(conference_scores,journal_scores,journal_only):
    journal_ave = average_scores(journal_scores)
    conference_ave = average_scores(conference_scores)
    if journal_only:
        return journal_ave
    return max(conference_ave, journal_ave)

def all_scores_to_string(conference_scores,journal_scores,consensus_code,journal_only):
    if journal_only:
        score_string = 'c[x]'
    else:
        score_string =  'c' + scores_to_string(conference_scores)
    score_string += ' j' + scores_to_string(journal_scores) + \
                    ' bbs: ' + consensus_code
    return score_string

def reviews_to_score_lists(reviews):
    conference_scores = []
    journal_scores = []
    consensus_recs = []
    for review in reviews:
        conference_scores.append( review.conference )
        journal_scores.append( review.journal )
        if review.role >= 1 and review.role <= 2: # primary or secondary
            consensus_recs.append(review.consensus)
    return conference_scores,journal_scores,consensus_recs

def consensus_num_code_to_enum(str):
    if not len(str):
        return status_str_to_enum('Tabled') # default
    num = float_str_to_int(str)
    if num == -1:
        return status_str_to_enum('Reject')
    elif num == 1:
        return status_str_to_enum('Conference')
    elif num == 2:
        return status_str_to_enum('Journal')
    return status_str_to_enum('Tabled') # default

def papers_set_all_scores_and_status_from_reviews():
    # now = datetime.now()
    papers = Paper.query.all()
    missing_review_nids = []
    weird_conf_nids = []
    for paper in papers:
        # add score summaries to paper
        reviews = paper.reviews.order_by(Review.role)
        if len(list(reviews)):
            conference_scores,journal_scores,consensus_recs = \
                reviews_to_score_lists(reviews)
            consensus_enum,consensus_str = get_consensus_info(consensus_recs)
            paper.sort_score = all_scores_to_sort_score(conference_scores,journal_scores,paper.journal_only)
            paper.all_scores = all_scores_to_string(conference_scores,journal_scores,consensus_str,paper.journal_only)
            paper.missing_reviews = False
            if weird_conf_scores(conference_scores):
                weird_conf_nids.append(paper.nid)
        else:
            paper.sort_score = 0
            paper.all_scores = 'This paper has no reviews.'
            paper.missing_reviews = True
            missing_review_nids.append(paper.nid)
        db.session.add(paper)

        # add BBS history ### ??? later: fix time below...
        # then = now - timedelta(days = 7) # pretend this is a week ago (for debug)
        context_enum = int(HistoryContext.BBS)
        history = History(paper=paper,
                        context_enum=context_enum,
                        status_enum=consensus_enum)
        db.session.add(history)
    print('papers missing reviews: ', missing_review_nids)
    print('weird conf scores: ', weird_conf_nids)
    db.session.commit()

# old: Submission ID,Role,Conference Score,Journal Score,Consensus Recommendation
# new: Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation
def insert_review_rows(rows):
    delete_all_reviews()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        # expertise ignored for now (col bet journal and consensus):
        sid,role,conference,journal,_,consensus = row
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            # add review
            role_num = review_role_to_num(role)
            conference = review_str_to_num(conference)
            journal = review_str_to_num(journal)
            consensus_enum = consensus_num_code_to_enum(consensus)
            review = Review(paper=paper,
                            role=role_num,
                            conference=conference,
                            journal=journal,
                            consensus=consensus_enum)
            db.session.add(review)
            count += 1
    db.session.commit()
    papers_set_all_scores_and_status_from_reviews()
    return count

def status_letter_to_history(status_string):
    letter = status_string[0]
    for entry in HistoryStatus:
        if entry.name[0] == letter:
            return entry.value, entry.name
    return 0, 'Tabled'

# Submission ID,Seconds,Context,Status
def insert_history_rows(rows):
    delete_non_bbs_history() # delete history since BBS
    now = datetime.now()
    count = 0
    for row in rows:
        if len(row) < 4:
            continue
        sid,_,context,status = row
        nid = sid_to_num(sid)
        # secs = int(secs) # Now ignoring time which was hack for debugging
        paper = Paper.query.filter_by(nid=nid).first()
        if paper:
            # then = now - timedelta(seconds=secs)
            context_enum = context_str_to_enum(context)
            status_enum = consensus_num_code_to_enum(status)
            history = History(paper=paper,
                            # when=then,
                            context_enum=context_enum,
                            status_enum=status_enum)
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
    'summaries' : 'commitee_notes.csv' }

csvTypes = {
    'users' : 'Email,First Name,Last Name,Role,Password',
    'papers' : 'Submission ID,Thumbnail URL,Title,Area,Conference,Abstract',
    'conflicts' : 'Submission ID,Email',
    'clusters' : 'Submission ID,Cluster',
    'reviews' : 'Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation',
    'summaries' : 'Submission ID,Committee Notes',
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
    'reviews' : ['history'],
    'papers' : ['reviews', 'conflicts', 'history', 'clusters', 'summaries'] }

def is_csv(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext == 'csv'

def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)

def csv_row_total_content_len(row):
    lengths = [len(item) for item in row]
    total = sum(lengths)
    return total

def read_csv_rows(filename):
    with open(filename) as f:
        csvReader = csv.reader(f)
        rows = []
        for row in csvReader:
            if csv_row_total_content_len(row) > 3: # arb min
                rows.append(row)
    if len(rows) < 1:
        return None, None
    header = rows[0]
    header = ','.join(header)
    rows = rows[1:]
    return header, rows

def get_csv_type(header):
    header = header.lower() # only check lower case
    for typ in csvTypes:
        knownHeader = csvTypes[typ].lower() # lower case
        if header.startswith(knownHeader):
            cols = knownHeader.split(',')
            ncols = len(cols)
            return typ, ncols
    return None, 0

def omit_extra_cols(rows, ncols):
    rows = [ cols[:ncols] for cols in rows ]
    return rows

def delete_prev_file_uploads(headerType):
    if headerType not in csvDependence:
        print('about to delete headerType: ', headerType)
        FileUpload.query.filter_by(file=headerType).delete()
        return
    del_list = csvDependence[headerType]
    del_list = list(del_list)
    del_list.append(headerType)
    for name in del_list:
        num_deleted = FileUpload.query.filter_by(file=name).delete()
        print(f'delete {num_deleted} file of types {name}')

def read_csv(filename):
    header, rows = read_csv_rows(filename)
    headerType, ncols = get_csv_type(header)
    rows = omit_extra_cols(rows, ncols)
    if headerType in csvFunctions:
        func = csvFunctions[headerType]
        if not func:
            return False, False
        count = func(rows)
        delete_prev_file_uploads(headerType)
        upload = FileUpload(file=headerType, count=count)
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
    keys = list(csvLinklings.keys())
    pending = [key for key in keys if key not in already]
    # print(already, keys, pending)
    return pending

# following https://flask.palletsprojects.com/en/2.1.x/patterns/fileuploads/
@upload.route('/', methods=('GET', 'POST'))
def upload_main():
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

def write_text_to_file(text, filename):
    with open(filename, 'w') as f:
        f.write(text)

def write_csv(rows, filename):
    text = '\n'.join(rows)
    write_text_to_file(text, filename)

# this function and the next duplicate functions in sockets/routes.py
# they should be refactored!
def get_latest_history(paper):
    latest_history = History.query.filter_by(paper_id=paper.id) \
        .order_by(History.when.desc()).first()
    return latest_history

def get_latest_history_status(paper):
    latest = get_latest_history(paper)
    if latest:
        return latest.status
    return None

def get_results_as_rows():
    papers = Paper.query.all()
    header = 'Submission ID,Status'
    rows = [ header ]
    for paper in papers:
        status = get_latest_history_status(paper)
        row = f'{paper.sid},{status}'
        rows.append(row)
    return rows


@upload.route('/download_results_csv')
def download_results_csv():
    app = current_app._get_current_object()
    folder = app.config['UPLOAD_FOLDER']
    make_path_if_needed(folder)
    filename = 'hepcat-results.csv'
    fullpath = os.path.join(folder, filename)
    rows = get_results_as_rows()
    write_csv(rows, fullpath)
    return send_file(fullpath, as_attachment=True)


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