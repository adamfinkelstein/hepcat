import os
import math
import random
import numpy as np
from faker import Faker

# globals
fake = Faker()
dataDir = 'data'

# make data directory if needed
if not os.path.exists(dataDir):
    os.makedirs(dataDir)

# users: Email,First Name,Last Name,Role,Password
# papers: Submission ID,Thumbnail URL,Title,Abstract
# conflicts: Submission ID,Email
# clusters: Submission ID,Cluster
# reviews: Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation
# summaries: Submission ID,Committee Notes
# history: Submission ID,Seconds,Status

def write_file(fname, contents):
    path = f'{dataDir}/{fname}'
    with open(path, 'w') as f:
        f.write(contents)

def name_to_email(first, last):
    first = first.lower()
    last = last.lower()
    email = f'{first}.{last}@example.com'
    return email

def random_role():
    r = random.randint(0,100)
    if r > 10:
        return ''
    elif r > 6:
        return 'Chair'
    else:
        return 'Admin'

# users: Email,First Name,Last Name,Role,Password
def fake_person(role=None, first=None, last=None):
    if not first:
        first = fake.first_name()
    if not last:
        last = fake.last_name()
    if not role:
        role = '' # formerly: random_role()
    email = name_to_email(first,last)
    passwd = fake.password()
    result = f'{email},{first},{last},{role},{passwd}\n'
    return result,email

def fake_users(n, fname):
    emails = []
    people = 'Email,First Name,Last Name,Role,Password\n'
    person,email = fake_person('Admin')
    people += person
    person,email = fake_person('Screen','Screen','User')
    people += person
    emails.append(email)
    for i in range(2,n):
        person,email = fake_person(None)
        people += person
        emails.append(email)
    write_file(fname,people)
    return emails

def rand_color():
    color = "%03x" % random.randint(0, 0xFFF)
    return color

def csv_safe_string(s):
    return s.replace(',', '').replace('"', '').replace("'", '')

area_options = ['Animation/Simulation','Imaging/Video','Interaction/VR','Modeling/Geometry','Rendering/Visualization']

def fake_area():
    return random.choice(area_options)

# papers: Submission ID,Thumbnail URL,Title,Area,Conference,Abstract
# assumes n is a 3-digit number
def fake_paper(pid):
    c1 = rand_color()
    c2 = rand_color()
    n = pid.replace('papers_','')
    # like this: https://fakeimg.pl/600x450/a42/fa8/?text=255&font_size=240&font=bebas
    url = f'https://fakeimg.pl/600x450/{c1}/{c2}/?text={n}&font_size=240&font=bebas'
    title    = csv_safe_string( fake.sentence(nb_words=7) )
    abstract = csv_safe_string( fake.paragraph(nb_sentences=12) )
    title = title[:-1] # remove trailing period
    title = title.title() # each word caps
    area = fake_area()
    conf = random.choice(['yes','no'])
    result = f'{pid},{url},{title},{area},{conf},{abstract}\n'
    return result,conf

def fake_papers(n, fname):
    conf_pids = []
    pids = []
    papers = 'Submission ID,Thumbnail URL,Title,Area,Conference,Abstract\n'
    start = 101
    for i in range(start, start+n):
        pid = f'papers_{i}'
        paper_line,conf = fake_paper(pid)
        papers += paper_line
        pids.append(pid)
        if conf == 'yes':
            conf_pids.append(pid)
    write_file(fname,papers)
    return pids,conf_pids

def rand_num_conflicts():
    n = math.floor( np.random.poisson(3) )
    return n

def rand_conflicts(emails, n):
    ems = emails.copy()
    random.shuffle(ems)
    ems = ems[:n]
    return ems

# conflicts: Submission ID,Email
def fake_conflicts(emails, papers, fname):
    conflicts = 'Submission ID,Email\n'
    for pid in papers:
        n = rand_num_conflicts()
        conf = rand_conflicts(emails, n)
        for c in conf:
            conflicts += f'{pid},{c}\n'
    write_file(fname, conflicts)

def gaussian(x, mu, sig):
    return np.exp(-np.power(x - mu, 2.) / (2 * np.power(sig, 2.)))

def dumpOptions(weights, revs):
    w = np.array(weights)
    w *= 100.0 / sum(weights)
    w = np.around(w)
    w = np.uint32(w).tolist()
    print(w)
    print(revs)
    print()

def rand_reviews(n):
    mu = random.uniform(-3.0, 3.0)
    sig = 2.0
    options = [-5,-3,-1,1,3,5]
    weights = []
    for opt in options:
        w = gaussian(opt, mu, sig)
        weights.append(w)
    revs = random.choices(options, weights, k=n)
    # dumpOptions(weights, revs)
    # if random.uniform(0.0,1.0) > 0.5:
    #     for i in range(5):
    #         revs[i] = 0
    return revs

def revs_to_rec(revs):
    journal_revs = revs[5:]
    tot = 1.0 * sum(journal_revs) / len(journal_revs)
    if tot > 1.6:
        return 1
    elif tot < -1:
        return -1
    else:
        return 0

def gen_status(rec):
    if rec == 0:
        return '0' # Tabled
    if rec > 0:
        return random.choice(['1','2']) # Conf or Jour
    return '-1' # Reject

# new: Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation
def fmt_review(pid, rev, conf_score, jour_score, rec):
    line = f'{pid},{rev},{conf_score},{jour_score},0,{rec}\n' # expertise ignored for now
    return line

def fake_paper_reviews(pid,conf):
    pri = 'Technical Papers Committee Member (lead)'
    sec = 'Technical Papers Committee Member'
    ter = 'Technical Papers Tertiary Reviewer'
    if conf:
        revs = rand_reviews(10)
    else:
        revs = [0, 0, 0, 0, 0] + rand_reviews(5)
    # print(conf, revs)
    rec = gen_status(revs_to_rec(revs))
    result  = fmt_review(pid, pri, revs[0], revs[5], rec)
    result += fmt_review(pid, sec, revs[1], revs[6], rec)
    result += fmt_review(pid, ter, revs[2], revs[7], '')
    result += fmt_review(pid, ter, revs[3], revs[8], '')
    result += fmt_review(pid, ter, revs[4], revs[9], '')
    return result, rec

# reviews: Submission ID,Role,Conference Score,Journal Score,Consensus Recommendation
# new: Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation
def fake_reviews(papers, conf_papers, fname):
    output = 'Submission ID,Role,Conference Score,Journal Score,Expertise,Final Recommendation\n'
    recs = {}
    for pid in papers:
        conf = False
        if pid in conf_papers:
            conf = True
        line,rec = fake_paper_reviews(pid,conf)
        output += line
        recs[pid] = rec
    write_file(fname, output)
    return recs

# summary: Submission ID,Committee Notes
def fake_summaries(papers, fname):
    output = 'Submission ID,Committee Notes\n'
    for pid in papers:
        summary = csv_safe_string( fake.sentence(nb_words=12) )
        line = f'{pid},{summary}\n'
        output += line
    write_file(fname, output)

cluster_options=['A','B','C','D','E']

# clusters: Submission ID,Cluster
def fake_clusters(papers, fname):
    output = 'Submission ID,Cluster\n'
    dups = papers[:] # shallow copy
    keep = int(len(papers) * 0.1) # keep 0%
    dups = dups[:keep]
    random.shuffle(dups)
    for pid in dups:
        cluster = random.choice(cluster_options)
        line = f'{pid},{cluster}\n'
        output += line
    write_file(fname, output)

# history: Submission ID,Seconds,Context,Status
def fake_history(recs, fname):
    papers = recs.keys()
    papers = list(papers)
    random.shuffle(papers)
    keep = int(len(papers) * 0.7) # keep 70%
    papers = papers[:keep]

    dups = papers[:] # shallow copy
    random.shuffle(dups)
    keep = int(len(papers) * 0.4) # keep 40%
    dups = dups[:keep]
    papers += dups
    seconds = 100
    lines = []
    for pid in papers:
        seconds += random.randrange(100,200)
        status = recs[pid]
        context = random.choice(['Stickie','Plenary'])
        line = f'{pid},-{seconds},{context},{status}\n'
        lines.append(line)
    lines.reverse() # this puts them in time order
    output = 'Submission ID,Seconds,Context,Status\n'
    output += ''.join(lines)
    write_file(fname, output)

def main():
    emails = fake_users(50, 'users.csv')
    papers,conf_papers = fake_papers(500, 'papers.csv')
    fake_conflicts(emails, papers, 'conflicts.csv')
    recs = fake_reviews(papers, conf_papers, 'reviews.csv')
    fake_summaries(papers, 'summaries.csv')
    fake_clusters(papers, 'clusters.csv')
    fake_history(recs, 'history.csv')

if __name__ == "__main__":
    main()
