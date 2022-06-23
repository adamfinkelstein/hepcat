# Hepcat project source tree

This is the source code for the Hepcat project. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH PC meeeting.

## To test at Heroku:

Visit: `https://hepcat4.herokuapp.com/`

## To clone and set up:

```
git clone https://github.com/adamfinkelstein/hepcat.git
cd hepcat
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
npm install
npm run build
```

## To set up heroku:

Set up Heroku app and add it to git remotes. 
Also set environment variables at Heroku, at least:

* `SECRET_KEY`
* `DATABASE_URL_HEROKU` (to the postgres database)
* `FLASK_CONFIG=production` (later, make this default in code)
* `MAIL_USERNAME`
* `MAIL_PASSWORD`
* `HEPCAT_ADMIN_LOGIN`
* `HEPCAT_ADMIN_PASSWD`

Then:

```
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add heroku/python
heroku buildpacks
git push heroku
```

