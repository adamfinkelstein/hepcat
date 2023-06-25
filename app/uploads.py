import os
import csv
from flask import render_template, flash, redirect, url_for, send_file, current_app
from flask_login import login_required, logout_user, current_user
from werkzeug.utils import secure_filename
from . import db
from .models import User, Paper, Review, History, LabelType, HistoryContext, HistoryStatus, Label, FileUpload, \
    sid_to_num, get_or_insert_role, dump_users_papers_and_conflicts, \
    context_str_to_enum, status_str_to_enum, status_enum_to_str, wipe_db_clean, \
    ensure_admin, ensure_all_gqs, drop_and_rebuild_tables, get_config_or_default, conflicts, tags

def delete_all_users():
    dump_users_papers_and_conflicts('Before deleting users')
    users = User.query.all()
    count = len(users)
    # slightly lame optimization: prevents need to logout
    if count < 3: # account for admin and chair
        return
    drop_and_rebuild_tables('conflicts,users,roles')
    ensure_admin()
    dump_users_papers_and_conflicts('After deleting users')

def delete_all_papers():
    dump_users_papers_and_conflicts('Before deleting papers')
    drop_and_rebuild_tables('history,conflicts,tags,labels,reviews,papers,glob_queue')
    ensure_all_gqs()
    dump_users_papers_and_conflicts('After deleting papers')

def delete_all_conflicts():
    dump_users_papers_and_conflicts('Before deleting conflicts')
    drop_and_rebuild_tables('conflicts')
    dump_users_papers_and_conflicts('After deleting conflicts')

def delete_all_clusters():
    dump_users_papers_and_conflicts('Before deleting clusters')
    papers = Paper.query.all()
    for paper in papers:
        # first remove all cluster labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_cluster]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    # Why did I have this lame, broken method?
    # cluster_labels = Label.query.filter(Label.is_cluster).all()
    # cluster_names = [label.name for label in list(cluster_labels)]
    # for name in cluster_names:
    #     Label.query.filter_by(name=name).delete()
    num_deleted = Label.query.filter(Label.is_cluster).delete()
    print(f'delete {num_deleted} cluster labels.')
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed in deleting clusters'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After deleting clusters')

# this function mimics delete_all_clusters above
def delete_all_paper_rooms():
    dump_users_papers_and_conflicts('Before deleting paper rooms')
    papers = Paper.query.all()
    for paper in papers:
        # first remove all room labels from paper
        labels = list(paper.tag_labels)
        new_labels = [label for label in labels if not label.is_room]
        if len(new_labels) < len(labels):
            paper.tag_labels = new_labels
            db.session.add(paper)
    # Why did I have this lame, broken method?
    # room_labels = Label.query.filter(Label.is_room).all()
    # room_names = [label.name for label in list(room_labels)]
    # for name in room_names:
    #     Label.query.filter_by(name=name).delete()
    num_deleted = Label.query.filter(Label.is_room).delete()
    print(f'delete {num_deleted} cluster labels.')
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed in deleting paper rooms'
        print(msg)
        flash(msg)
    dump_users_papers_and_conflicts('After deleting paper rooms')

# 2023?
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

# needed before uploading reviews
def delete_all_reviews():
    delete_all_history() # need to delete history (below)
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

# needed when deleting reviews (above)
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

# 2023?
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

# 2023?
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
    delete_all_users()
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
    delete_all_papers()
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
    delete_all_paper_rooms()
    room_type = int(LabelType.Room)
    count = insert_label_rows(rows, room_type)
    return count

# Email,Rooms
def insert_people_room_rows(rows):
    # first delete any existing room assignments...
    users = User.query.all()
    for person in users:
        person.rooms = None
        person.in_room = None
        db.session.add(person)
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

def average_scores(chair_score, scores, boost):
    if chair_score != None:
        return chair_score
    n = len(scores)
    ave = 0.0
    if n:
        ave = 1.0 * sum(scores) / n
    return ave + boost

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

def get_boost_dual_submission_score_for_alla_sheffer():
    boost = get_config_or_default('DUAL_BOOST_FOR_ALLA','0.0')
    boost = float(boost)
    return boost

def papers_set_all_scores_and_status_from_reviews():
    # now = datetime.now()
    papers = Paper.query.all()
    dual_boost = get_boost_dual_submission_score_for_alla_sheffer()
    for paper in papers:
        # add score summaries to paper
        reviews = paper.reviews.order_by(Review.role)
        if len(list(reviews)):
            scores,recs,consensus_recs,chair_score = reviews_to_score_lists(reviews)
            consensus_enum,consensus_str = get_consensus_info(consensus_recs)
            boost = 0.0
            if not paper.journal_only: # dual submission gets boost for Alla
                boost = dual_boost
            paper.sort_score = average_scores(chair_score,scores,boost)
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
    delete_all_reviews()
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
    'users' : ['conflicts', 'people_rooms'],
    'reviews' : ['history', 'chair_scores'],
    'papers' : ['reviews', 'conflicts', 'history', 'clusters', 'paper_rooms', 'summaries', 'chair_scores'] }

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
    if not header:
        return None, 0
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

def delete_prev_file_uploads(header_type):
    if header_type not in csvDependence:
        print('about to delete header_type: ', header_type)
        FileUpload.query.filter_by(file=header_type).delete()
        return
    del_list = csvDependence[header_type]
    del_list = list(del_list)
    del_list.append(header_type)
    for name in del_list:
        num_deleted = FileUpload.query.filter_by(file=name).delete()
        print(f'delete {num_deleted} file of types {name}')

def read_csv(filename):
    header, rows = read_csv_rows(filename)
    header_type, ncols = get_csv_type(header)
    if not header_type or header_type not in csvFunctions:
        return False, False, ''
    rows = omit_extra_cols(rows, ncols)
    func = csvFunctions[header_type]
    if not func:
        return False, False, '' # this should never happen because of test above
    count = func(rows)
    if count < 0:
        return "already_sent_flash_msg", False, ''
    delete_prev_file_uploads(header_type)
    upload = FileUpload(file=header_type, count=count)
    db.session.add(upload)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        msg = 'failed to add file upload record'
        print(msg)
    msg = dump_users_papers_and_conflicts('After Upload')
    if header_type == 'users':
        msg += ' You have been logged out because users were updated.'
        return msg, True, header_type
    return msg, False, header_type

def pending_uploads(uploads):
    already = [upload.file for upload in uploads]
    keys = list(csvLinklings.keys())
    pending = [key for key in keys if key not in already]
    # print(already, keys, pending)
    return pending

def save_and_read_csv(data, filename):
    app = current_app._get_current_object()
    folder = app.config['UPLOAD_FOLDER']
    make_path_if_needed(folder)
    fullpath = os.path.join(folder, filename)
    # file.save(fullpath) # when it was a file upload
    with open(fullpath, "wb") as f:
        f.write(data)
    # flash('saved csv file here: '+fullpath)
    msg, logout, header_type = read_csv(fullpath)
    return msg, logout, header_type

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
        .filter(History.context_enum >= context_plenary) \
        .order_by(History.when.desc()).first()
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
    # check current_user.is_authenticated
    user = current_user
    if user and user.is_authenticated and user.role_is_admin:
        return True
    return False

def current_user_is_super():
    user = current_user
    if user and user.is_authenticated and user.role_is_super:
        return True
    return False

def write_results_csv():
    app = current_app._get_current_object()
    folder = app.config['UPLOAD_FOLDER']
    make_path_if_needed(folder)
    filename = 'hepcat-results.csv'
    fullpath = os.path.join(folder, filename)
    rows = get_results_as_rows()
    write_csv(rows, fullpath)
    return fullpath

