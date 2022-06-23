# Hepcat project source tree

This is the source code for the Hepcat project. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH PC meeeting.

## To test at Heroku:

Visit: `https://hepcat4.herokuapp.com/`

## Architecture

This app uses the following major components:

* Flask - backend
	* SQAlchemy (database)
	* Flask-Login (for authentication)
* React - frontend
	* Bootstrap for styling/widgets
	* Commpiled static version served in production
* Socket.IO - communication between backend and frontend

## To clone and set up locally:

This works in python version 3.9.13 (generally 3.9.x):

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

## To run locally:

* `python hepcat.py` - This lauches the Flask server. Then navigate browser to `http://127.0.0.1:5000`. Log in using one of the test/admin accounts (see `ensure_admin()` in `models.py`). When you visit the React app in that page (after login) you are getting the version complied by `npm run build` above. 
* In addition, you can get a live React server running too, as follows. Before launching Flask (python, as above), `export ALLOW_CORS=True`. Now, while Flask server is running, you can also use `npm start` to launch a React server to serve the React app, and it will connect by socketio to the Flask server (CORS required). To get to the live-updating React app, navigate browser to `http://127.0.0.1:3000`.
* If you don't specify the database URL it writes a local SQL file-based database. Or you can connect to a local Postgres database via:  `DEV_DATABASE_URL=postgresql://localhost`. (AF tested on Mac with Postgres Version 2.5.6.)

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

