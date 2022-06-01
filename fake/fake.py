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

def writeFile(fname, contents):
    path = f'{dataDir}/{fname}'
    with open(path, 'w') as f:
        f.write(contents)

def nameToEmail(first, last):
    first = first.lower()
    last = last.lower()
    email = f'{first}.{last}@example.com'
    return email

def randomRole():
    r = random.randint(0,100)
    if r > 10:
        return ''
    elif r > 6:
        return 'Chair'
    else:
        return 'Admin'

# Users: Email,First Name,Last Name,Role,Password
def fakePerson(role):
    first = fake.first_name()
    last = fake.last_name()
    email = nameToEmail(first,last)
    passwd = fake.password()
    if not role:
        role = randomRole()
    result = f'{email},{first},{last},{role},{passwd}\n'
    return result,email

def fakeUsers(n, fname):
    emails = []
    people = 'Email,First Name,Last Name,Role,Password\n'
    person,email = fakePerson('Admin')
    people += person
    emails.append(email)
    for i in range(1,n):
        person,email = fakePerson(None)
        people += person
        emails.append(email)
    writeFile(fname,people)
    return emails

def randColor():
    color = "%03x" % random.randint(0, 0xFFF)
    return color

def csvSafeString(s):
    return s.replace(',', '').replace('"', '').replace("'", '')

# Abstracts: Submission ID,Thumbnail URL,Title,Abstract
# assumes n is a 3-digit number
def fakePaper(pid):
    c1 = randColor()
    c2 = randColor()
    n = pid.replace('papers_','')
    # like this: https://fakeimg.pl/600x450/a42/fa8/?text=255&font_size=240&font=bebas
    url = f'https://fakeimg.pl/600x450/{c1}/{c2}/?text={n}&font_size=240&font=bebas'
    title    = csvSafeString( fake.sentence(nb_words=7) )
    abstract = csvSafeString( fake.paragraph(nb_sentences=12) )
    title = title[:-1] # remove trailing period
    result = f'{pid},{url},{title},{abstract}\n'
    return result

def fakePapers(n, fname):
    pids = []
    papers = 'Submission ID,Thumbnail URL,Title,Abstract\n'
    start = 101
    for i in range(start, start+n):
        pid = f'papers_{i}'
        papers += fakePaper(pid)
        pids.append(pid)
    writeFile(fname,papers)
    return pids

def randNumConflicts():
    n = math.floor( np.random.poisson(3) )
    return n

def randConflicts(emails, n):
    ems = emails.copy()
    random.shuffle(ems)
    ems = ems[:n]
    return ems

# Conflicts: Submission ID,Email
def fakeConflicts(emails, papers, fname):
    conflicts = 'Submission ID,Email\n'
    for pid in papers:
        n = randNumConflicts()
        conf = randConflicts(emails, n)
        for c in conf:
            conflicts += f'{pid},{c}\n'
    writeFile(fname, conflicts)

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

def randReviews(n):
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

def revsToRec(revs):
    tot = sum(revs)
    if tot > 8:
        return 1
    elif tot < -1:
        return -1
    else:
        return ''

def fmtReview(pid, rev, score, rec):
    line = f'{pid},{rev},{score},{rec}\n'
    return line

def fakePaperReviews(pid):
    pri = 'Technical Papers Committee Member (lead)'
    sec = 'Technical Papers Committee Member'
    ter = 'Technical Papers Tertiary Reviewer'
    revs = randReviews(5)
    rec = revsToRec(revs)
    result  = fmtReview(pid, pri, revs[0], rec)
    result += fmtReview(pid, sec, revs[1], rec)
    result += fmtReview(pid, ter, revs[2], '')
    result += fmtReview(pid, ter, revs[3], '')
    result += fmtReview(pid, ter, revs[4], '')
    return result

# Status: Submission ID,Role,Rating,Consensus Recommendation
def fakeReviews(papers, fname):
    output = 'Submission ID,Role,Rating,Consensus Recommendation\n'
    for pid in papers:
        output += fakePaperReviews(pid)
    writeFile(fname, output)

# Status: Submission ID,Summary
def fakeSummaries(papers, fname):
    output = 'Submission ID,Summary\n'
    for pid in papers:
        summary = csvSafeString( fake.sentence(nb_words=12) )
        line = f'{pid},{summary}\n'
        output += line
    writeFile(fname, output)

def main():
    emails = fakeUsers(50, 'users.csv')
    papers = fakePapers(500, 'papers.csv')
    fakeConflicts(emails, papers, 'conflicts.csv')
    fakeReviews(papers, 'reviews.csv')
    fakeSummaries(papers, 'summaries.csv')

if __name__ == "__main__":
    main()
