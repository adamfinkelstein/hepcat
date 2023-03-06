import os
import csv
# from datetime import datetime, timedelta
from flask import render_template, flash, redirect, url_for, send_file, current_app
# from flask_login import current_user
from flask_login import login_required, logout_user, current_user
from werkzeug.utils import secure_filename
# from sqlalchemy import func
from . import upload
from .forms import UploadForm
from .. import db
from ..models import User, Paper, Review, History, LabelType, HistoryContext, HistoryStatus, Label, FileUpload, \
    sid_to_num, get_or_insert_role, \
    context_str_to_enum, status_str_to_enum, status_enum_to_str, wipe_db_clean, conflicts, tags

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

def delete_all_conflicts(): ### ??? Never called!
    dump_users_papers_and_conflicts('Before conflict deletion')
    # this also doesn't work on all dbs: drop_conflicts()
    # users = User.query.all()
    # for user in users:
    #     user.conf_papers = [] # empty list
    #     db.session.add(user)
    # try:
    #     db.session.commit()
    # except:
    #     db.session.rollback()
    #     msg = 'failed in delete_all_conflicts'
    #     print(msg)
    #     flash(msg)
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
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed in delete_all_clusters'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After cluster deletion')

def delete_all_labels():
    dump_users_papers_and_conflicts('Before label deletion')
    labels = Label.query.all()
    for label in labels:
        label.tag_papers = [] # empty list
        db.session.add(label)
    try:
        db.session.commit()
        num_deleted = Label.query.delete()
        db.session.commit()
        print(f'deleted {num_deleted} labels')
    except:
        db.session.rollback()
        msg = 'failed in delete_all_labels'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After label deletion')

def delete_all_users(): ### ??? Never called!
    delete_all_conflicts() # need to delete conflicts before users
    dump_users_papers_and_conflicts('Before user deletion')
    # see: https://stackoverflow.com/questions/3481976/ 
    num_deleted = User.query.delete() # delete(synchronize_session='fetch')
    try:
        db.session.commit()
        print(f'Deleted {num_deleted} users.')
    except:
        db.session.rollback()
        msg = 'failed in delete_all_users'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After user deletion')

def delete_all_papers(): ### ??? Never called!
    delete_all_reviews() # need to delete reviews before papers
    delete_all_history() # need to delete history before papers
    delete_all_conflicts() # need to delete conflicts before papers
    delete_all_labels() # need to delete labels before papers
    dump_users_papers_and_conflicts('Before paper deletion')
    num_deleted = Paper.query.delete()
    try:
        db.session.commit()
        print(f'Deleted {num_deleted} papers.')
    except:
        db.session.rollback()
        msg = 'failed in delete_all_papers'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After paper deletion')

def delete_all_reviews():
    delete_all_history() # need to delete history before reviews
    dump_users_papers_and_conflicts('Before review deletion')
    num_deleted = Review.query.delete()
    try:
        db.session.commit()
        print(f'Deleted {num_deleted} reviews.')
    except:
        db.session.rollback()
        msg = 'failed in delete_all_reviews'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After review deletion')

def delete_all_history():
    dump_users_papers_and_conflicts('Before History deletion')
    num_deleted = History.query.delete()
    try:
        db.session.commit()
        print(f'Deleted {num_deleted} history entries.')
    except:
        db.session.rollback()
        msg = 'failed in delete_all_history'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After History deletion')

# this is before history upload, which is just for debugging
def delete_non_bbs_history():
    dump_users_papers_and_conflicts('Before non-BBS History deletion')
    context_bbs = int(HistoryContext.BBS)
    # Note that filter() allows for != (but filter_by does not allow it)
    num_deleted = History.query.filter(History.context_enum != context_bbs).delete()
    try:
        db.session.commit()
        print(f'Deleted {num_deleted} history entries.')
    except:
        db.session.rollback()
        msg = 'failed in delete_non_bbs_history'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After non-BBS History deletion')

def delete_all_summaries():
    papers = Paper.query.all()
    count = len(papers)
    for paper in papers:
        paper.summary = ''
        db.session.add(paper)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed in delete_all_summaries'
        print(msg)
        flash(msg)
    print(f'Deleted {count} summaries.')

def delete_all_uploads():
    num_deleted = FileUpload.query.delete()
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed in delete_all_uploads'
        print(msg)
        flash(msg)
    print(f'Deleted {num_deleted} file upload entries.')

# Email,First Name,Last Name,Role,Password
def insert_user_rows(rows):
    users = User.query.all()
    count = len(users)
    if count>1: # account for admin user. (maybe check uploads instead?)
        msg = 'PLEASE WIPE DATABASE (below) before replacing users!'
        flash(msg,'error')
        return -1
    # This fails on heroku:
    # delete_all_users()
    # ensure_admin()
    # dump_users_papers_and_conflicts('After ensure')
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        email,first_name,last_name,role,password = row
        lower_email = email.lower() # ensure emails are all lower case
        user = User(email=lower_email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                    confirmed=True)
        if len(role):
            roleObj = get_or_insert_role(role)
            user.role = roleObj
        db.session.add(user)
        count += 1
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert user rows (possible duplicate email?)'
        print(msg)
        flash(msg)
        return 0
    dump_users_papers_and_conflicts('After insertion')
    return count

def journal_only_from_dual(dual):
    return (dual != "yes")

# 2022: Submission ID,Thumbnail URL,Title,Area,Abstract
# 2023: Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract
def insert_paper_rows(rows):
    papers = Paper.query.all()
    count = len(papers)
    if count:
        msg = 'PLEASE WIPE DATABASE (below) before replacing papers!'
        flash(msg,'error')
        return -1
    # This fails on heroku:
    # delete_all_papers()
    # reset_gq()
    area_type = int(LabelType.Area)
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        sid,thumbnail,title,areas,dual,abstract = row
        journal_only = journal_only_from_dual(dual)
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
            label = Label.query.filter(Label.is_area).filter_by(name=label_name).first()
            if not label:
                label = Label(type_enum=area_type,name=label_name)
                db.session.add(label)
            if label and paper:
                paper.tag_labels.append(label)
                db.session.add(paper)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert paper rows (possible duplicate paper id?)'
        print(msg)
        flash(msg)
        return 0
    return count

# Submission ID,Email
def insert_conflict_rows(rows):
    # This fails on heroku:
    # delete_all_conflicts()
    count = db.session.query(conflicts).count()
    if count:
        msg = 'PLEASE WIPE DATABASE (below) before replacing conflicts!'
        flash(msg,'error')
        return -1
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
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert conflict rows'
        print(msg)
        flash(msg)
        return 0
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
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert summaries'
        print(msg)
        flash(msg)
        return 0
    return count

# Used for both Clusters and Rooms
def insert_label_rows(rows, label_type):
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,label_name = row
        paper = Paper.query.filter_by(sid=sid).first()
        label = Label.query.filter_by(type_enum=label_type).filter_by(name=label_name).first()
        if not label:
            label = Label(type_enum=label_type,name=label_name)
            db.session.add(label)
        if label and paper:
            paper.tag_labels.append(label)
            db.session.add(paper)
            count += 1
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = f'failed to insert labels of type {label_type}'
        print(msg)
        flash(msg)
        return 0
    return count

# Submission ID,Cluster
def insert_cluster_rows(rows):
    delete_all_clusters()
    cluster_type = int(LabelType.Cluster)
    count = insert_label_rows(rows, cluster_type)
    return count

# Submission ID,Room
def insert_paper_room_rows(rows):
    # delete_all_rooms() XXXX ????
    room_type = int(LabelType.Room)
    count = insert_label_rows(rows, room_type)
    return count

# Email,Rooms
def insert_people_room_rows(rows):
    # delete_all_rooms() XXXX ????
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        email,rooms = row
        email = email.lower() # ensure emails are all lower case
        person = User.query.filter_by(email=email).first()
        if person and rooms:
            person.rooms = rooms
            db.session.add(person)
            count += 1
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = f'failed to insert people rooms'
        print(msg)
        flash(msg)
        return 0
    return count

def areas_to_label_names(areas_string):
    areas = areas_string.split('/')
    labels = [area.strip() for area in areas]
    return labels

def review_role_to_num(role):
    if 'CHAIR' in role:
        return 0
    elif 'lead' in role:
        return 1
    elif 'Committee' in role:
        return 2
    return 3

def float_str_to_int(s):
    return int(round(float(s)))

def review_str_to_float(s):
    s = s.strip()
    if len(s):
        return float(s)
    return 0

def review_str_to_int(s):
    f = review_str_to_float(s)
    i = int(round(f))
    return i

rating_codes_dict = {-5:'_R_', -3:'R', -1:'r', 0:'?', 1:'a', 3:'A', 5:'_A_'}
# [-3 -2 -1 1 2] -> [N C c j J]
rec_codes_dict = {-3:'N', -2:'C', -1:'c', 0:'?', 1:'j', 2:'J'}

def get_code_from_dict(rating, d):
    rating = int(rating)
    if rating in d:
        return d[rating]
    return '?'

def ratings_to_string(scores, d, brackets):
    codes = [ get_code_from_dict(score, d) for score in scores ]
    line = brackets[0] + ' ' + ' '.join(codes) + ' ' + brackets[1]
    return line

def scores_to_string(scores):
    return ratings_to_string(scores, rating_codes_dict, '[]')

def recs_to_string(recs):
    return ratings_to_string(recs, rec_codes_dict, '()')

def get_consensus_info(consensus_recs):
    # later: need to check for Conference / Journal?
    if len(consensus_recs) == 2 and consensus_recs[0] == consensus_recs[1]:
        enum = consensus_recs[0]
    else:
        enum = 0 # default is Tabled
    name = status_enum_to_str(enum)
    return enum, name

def average_scores(chair_score, scores):
    if chair_score != None:
        return chair_score
    n = len(scores)
    if n:
        ave = 1.0 * sum(scores) / n
        return ave
    return 0.0

def non_zero_scores(scores):
    scores = [ score for score in scores if score != 0 ]
    return scores

def all_scores_to_string(scores,recs,consensus_code,journal_only):
    score_string = scores_to_string(scores) + ' '
    if journal_only:
        score_string += '(journal only)'
    else:
        score_string +=  recs_to_string(recs)
    score_string += ' bbs: ' + consensus_code
    return score_string

def reviews_to_score_lists(reviews):
    scores = []
    recs = []
    consensus_recs = []
    chair_score = None
    for review in reviews:
        if review.role == 0: # CHAIR
            chair_score = review.score
        else:
            scores.append( review.score )
            recs.append( review.recommendation )
            if review.role >= 1 and review.role <= 2: # primary or secondary
                consensus_recs.append(review.consensus)
    return scores,recs,consensus_recs,chair_score

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
    for paper in papers:
        # add score summaries to paper
        reviews = paper.reviews.order_by(Review.role)
        if len(list(reviews)):
            scores,recs,consensus_recs,chair_score = reviews_to_score_lists(reviews)
            consensus_enum,consensus_str = get_consensus_info(consensus_recs)
            paper.sort_score = average_scores(chair_score,scores)
            paper.all_scores = all_scores_to_string(scores,recs,consensus_str,paper.journal_only)
        else:
            paper.sort_score = 0
            paper.all_scores = 'This paper has no reviews.'
        db.session.add(paper)

        # add BBS history ### ??? later: fix time below...
        # then = now - timedelta(days = 7) # pretend this is a week ago (for debug)
        context_enum = int(HistoryContext.BBS)
        history = History(paper=paper,
                        context_enum=context_enum,
                        status_enum=consensus_enum)
        db.session.add(history)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to set scores and status from reviews'
        print(msg)
        flash(msg)

# orig: Submission ID,Role,Conference Score,Journal Score,Consensus Recommendation
# 2022: Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation
# 2023: Submission ID,Role,Score,Conf/Jounal Rec,Expertise,Final Recommendation,Top 10%
def insert_review_rows(rows):
    reviews = Review.query.all()
    count = len(reviews)
    if count:
        msg = 'PLEASE WIPE DATABASE (below) before replacing reviews!'
        flash(msg,'error')
        return -1
    # This fails on heroku:
    # delete_all_reviews()
    count = 0
    for row in rows:
        if len(row) < 5:
            continue
        sid,role,score,recommendation,expertise = row[:5]
        consensus = row[5] if len(row) > 5 else '0' # default is tabled
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            # add review
            role_num = review_role_to_num(role)
            score = review_str_to_float(score)
            recommendation = review_str_to_int(recommendation)
            expertise = review_str_to_int(expertise)
            consensus_enum = consensus_num_code_to_enum(consensus)
            review = Review(paper=paper,
                            role=role_num,
                            score=score,
                            recommendation=recommendation,
                            expertise=expertise,
                            consensus=consensus_enum)
            db.session.add(review)
            count += 1
    try:
        db.session.commit()
        papers_set_all_scores_and_status_from_reviews()
    except:
        db.session.rollback()
        msg = 'failed to insert reviews'
        print(msg)
        flash(msg)
        return 0
    return count

def insert_chair_score_rows(rows):
    count = 0
    for row in rows:
        if len(row) < 2:
            continue
        sid,chair_score = row[:2]
        paper = Paper.query.filter_by(sid=sid).first()
        if paper:
            chair_score = review_str_to_float(chair_score)
            paper.sort_score = chair_score
            db.session.add(paper)
            count += 1
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert chair scores'
        print(msg)
        flash(msg)
        return 0
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
    # now = datetime.now()
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
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to insert history'
        print(msg)
        flash(msg)
        return 0
    return count

csvLinklings = {
    'users' : 'users.csv',
    'papers' : 'abstracts.csv',
    'conflicts' : 'conflicts.csv',
    'clusters' : 'clusters.csv',
    'paper_rooms' : 'paper_rooms.csv',
    'people_rooms' : 'people_rooms.csv',
    'reviews' : 'status.csv',
    'chair_scores' : 'chair_scores.csv',
    'summaries' : 'commitee_notes.csv' }

csvTypes = {
    'users' : 'Email,First Name,Last Name,Role,Password',
    'papers' : 'Submission ID,Thumbnail URL,Title,Area,Dual Track,Abstract',
    'conflicts' : 'Submission ID,Email',
    'clusters' : 'Submission ID,Cluster',
    'paper_rooms' : 'Submission ID,Room',
    'people_rooms' : 'Email,Rooms',
    'reviews' : 'Submission ID,Role,Score,Conf/Jounal Rec,Expertise,Final Recommendation',
    'chair_scores': 'Submission ID,Chair Score',
    'summaries' : 'Submission ID,Committee Notes',
    'history' : 'Submission ID,Seconds,Context,Status' }

csvFunctions = {
    'users' : insert_user_rows,
    'papers' : insert_paper_rows,
    'conflicts' : insert_conflict_rows,
    'clusters' : insert_cluster_rows,
    'paper_rooms' : insert_paper_room_rows,
    'people_rooms' : insert_people_room_rows,
    'reviews' : insert_review_rows,
    'chair_scores' : insert_chair_score_rows,
    'summaries' : insert_summary_rows,
    'history' : insert_history_rows }

csvDependence = {
    'users' : ['conflicts'],
    'reviews' : ['history'],
    'papers' : ['reviews', 'conflicts', 'history', 'clusters', 'paper_rooms', 'summaries'] }

def is_csv(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext == 'csv'

# same func appears in orderq.py (should consolidate somehow)
def make_path_if_needed(path):
    if not os.path.exists(path):
        os.makedirs(path)

def csv_row_strip_whitespace(row):
    row = [item.strip() for item in row]
    return row

def csv_row_total_content_chars(row):
    lengths = [len(item) for item in row]
    total = sum(lengths)
    return total

def read_csv_rows(filename):
    with open(filename) as f:
        csvReader = csv.reader(f)
        rows = []
        for row in csvReader:
            row = csv_row_strip_whitespace(row)
            if csv_row_total_content_chars(row) > 3: # arb min 3 chars
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
        if count < 0:
            return "already_sent", False
        delete_prev_file_uploads(headerType)
        upload = FileUpload(file=headerType, count=count)
        db.session.add(upload)
        try:
            db.session.commit()
        except:
            db.session.rollback()
            msg = 'failed to add file upload record'
            print(msg)
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
@login_required
def upload_main():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
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
            if msg != "already_sent":
                if msg:
                    msg = f'Uploaded file "{filename}". ' + msg
                else:
                    msg ='Unable to read csv file: ' + filename
                flash(msg)
    if logout:
        logout_user()
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
def get_latest_plenary_history(paper):
    context_plenary = int(HistoryContext.Plenary)
    latest_history = History.query.filter_by(paper_id=paper.id) \
        .filter_by(context_enum=context_plenary).order_by(History.when.desc()).first()
    return latest_history

def get_latest_plenary_history_status(paper):
    latest = get_latest_plenary_history(paper)
    if latest:
        return latest.status
    return None

def get_results_as_rows():
    papers = Paper.query.all()
    header = 'Submission ID,Status'
    rows = [ header ]
    for paper in papers:
        status = get_latest_plenary_history_status(paper)
        row = f'{paper.sid},{status}'
        rows.append(row)
    return rows

def current_user_is_admin():
    user = current_user
    if user and user.is_admin:
        return True
    return False

@upload.route('/download_results_csv')
@login_required
def download_results_csv():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    app = current_app._get_current_object()
    folder = app.config['UPLOAD_FOLDER']
    make_path_if_needed(folder)
    filename = 'hepcat-results.csv'
    fullpath = os.path.join(folder, filename)
    rows = get_results_as_rows()
    write_csv(rows, fullpath)
    return send_file(fullpath, as_attachment=True)

@upload.route('/wipe_database')
@login_required
def wipe_database():
    if not current_user_is_admin():
        return redirect(url_for('auth.login'))
    print('about to wipe database...')
    success = wipe_db_clean()
    if success:
        msg ='The database was wiped clean. You have been logged out.'
        flash(msg)
        logout_user()
        return redirect(url_for('auth.login'))
    msg ='The database wipe failed!'
    flash(msg)
    return redirect(url_for('upload.upload_main'))


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