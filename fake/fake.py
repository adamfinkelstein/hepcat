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
# reviews: Submission ID,Role,Rating,Consensus Recommendation
# summaries: Submission ID,Summary
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
def fake_person(role):
    first = fake.first_name()
    last = fake.last_name()
    email = name_to_email(first,last)
    passwd = fake.password()
    if not role:
        role = random_role()
    result = f'{email},{first},{last},{role},{passwd}\n'
    return result,email

def fake_users(n, fname):
    emails = []
    people = 'Email,First Name,Last Name,Role,Password\n'
    person,email = fake_person('Admin')
    people += person
    emails.append(email)
    for i in range(1,n):
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

area_options = ['Animation/Simulation','Imaging/Video','Interaction/VR','Modeling/Geometry','Rendering/Visualization'
]
def fake_area():
    return random.choice(area_options)

# papers: Submission ID,Thumbnail URL,Title,Area,Abstract
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
    result = f'{pid},{url},{title},{area},{abstract}\n'
    return result

def fake_papers(n, fname):
    pids = []
    papers = 'Submission ID,Thumbnail URL,Title,Area,Abstract\n'
    start = 101
    for i in range(start, start+n):
        pid = f'papers_{i}'
        papers += fake_paper(pid)
        pids.append(pid)
    write_file(fname,papers)
    return pids

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
    return revs

def revs_to_rec(revs):
    tot = sum(revs)
    if tot > 8:
        return 1
    elif tot < -1:
        return -1
    else:
        return ''

def gen_status(rec):
    if not rec:
        return 'T'
    if rec > 0:
        return random.choice(['C','J'])
    return 'R'

def fmt_review(pid, rev, score, rec):
    line = f'{pid},{rev},{score},{rec}\n'
    return line

def fake_paper_reviews(pid):
    pri = 'Technical Papers Committee Member (lead)'
    sec = 'Technical Papers Committee Member'
    ter = 'Technical Papers Tertiary Reviewer'
    revs = rand_reviews(5)
    rec = revs_to_rec(revs)
    result  = fmt_review(pid, pri, revs[0], rec)
    result += fmt_review(pid, sec, revs[1], rec)
    result += fmt_review(pid, ter, revs[2], '')
    result += fmt_review(pid, ter, revs[3], '')
    result += fmt_review(pid, ter, revs[4], '')
    return result, rec

# reviews: Submission ID,Role,Rating,Consensus Recommendation
def fake_reviews(papers, fname):
    output = 'Submission ID,Role,Rating,Consensus Recommendation\n'
    recs = {}
    for pid in papers:
        line,rec = fake_paper_reviews(pid)
        output += line
        recs[pid] = rec
    write_file(fname, output)
    return recs

# summary: Submission ID,Summary
def fake_summaries(papers, fname):
    output = 'Submission ID,Summary\n'
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
        status = gen_status(recs[pid])
        context = random.choice(['Sticky','Plenary'])
        line = f'{pid},-{seconds},{context},{status}\n'
        lines.append(line)
    lines.reverse()
    output = 'Submission ID,Seconds,Context,Status\n'
    output += ''.join(lines)
    write_file(fname, output)

def main():
    emails = fake_users(50, 'users.csv')
    papers = fake_papers(500, 'papers.csv')
    fake_conflicts(emails, papers, 'conflicts.csv')
    recs = fake_reviews(papers, 'reviews.csv')
    fake_summaries(papers, 'summaries.csv')
    fake_clusters(papers, 'clusters.csv')
    fake_history(recs, 'history.csv')

if __name__ == "__main__":
    main()
