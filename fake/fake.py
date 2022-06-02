import random
import math
import os
from asyncore import write
from faker import Faker
import numpy as np

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

# Users: Email,First Name,Last Name,Role,Password
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

# Abstracts: Submission ID,Thumbnail URL,Title,Abstract
# assumes n is a 3-digit number
def fakePaper(pid):
    c1 = rand_color()
    c2 = rand_color()
    n = pid.replace('papers_','')
    # like this: https://fakeimg.pl/600x450/a42/fa8/?text=255&font_size=240&font=bebas
    url = f'https://fakeimg.pl/600x450/{c1}/{c2}/?text={n}&font_size=240&font=bebas'
    title    = csv_safe_string( fake.sentence(nb_words=7) )
    abstract = csv_safe_string( fake.paragraph(nb_sentences=12) )
    title = title[:-1] # remove trailing period
    title = title.title() # each word caps
    result = f'{pid},{url},{title},{abstract}\n'
    return result

def fake_papers(n, fname):
    pids = []
    papers = 'Submission ID,Thumbnail URL,Title,Abstract\n'
    start = 101
    for i in range(start, start+n):
        pid = f'papers_{i}'
        papers += fakePaper(pid)
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

# Conflicts: Submission ID,Email
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
    # weights = [1,5,10,10,5,1] # manual
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
    return result

# Status: Submission ID,Role,Rating,Consensus Recommendation
def fake_reviews(papers, fname):
    output = 'Submission ID,Role,Rating,Consensus Recommendation\n'
    for pid in papers:
        output += fake_paper_reviews(pid)
    write_file(fname, output)

# Status: Submission ID,Summary
def fake_summaries(papers, fname):
    output = 'Submission ID,Summary\n'
    for pid in papers:
        summary = csv_safe_string( fake.sentence(nb_words=12) )
        line = f'{pid},{summary}\n'
        output += line
    write_file(fname, output)

def main():
    emails = fake_users(50, 'users.csv')
    papers = fake_papers(500, 'papers.csv')
    fake_conflicts(emails, papers, 'conflicts.csv')
    fake_reviews(papers, 'reviews.csv')
    fake_summaries(papers, 'summaries.csv')

if __name__ == "__main__":
    main()
