# Hepcat project source tree

This is the source code for the Hepcat project. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH PC meeeting.

## To test at Heroku:

Visit: `https://hepcat.herokuapp.com/`

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

First, you need Postgres. If you skip this step, you will get an error like `pg_config is required to build psycopg2 from source` when doing the pip install below. On mac you can install it several ways, including:

* [Postgres.app](https://postgresapp.com/downloads.html)
* Homebrew `brew install postgresql`
* Build from source (probably slower)


Next this works, at least in python version 3.9.13 (generally 3.9.x):

```
git clone https://github.com/adamfinkelstein/hepcat.git
cd hepcat
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt (or on m1, use -m1 version)

npm install (one time, to set up build directory etc)
npm run build
```

## Notes on installation above (problems Baris encountered)

This works in python version 3.9.13 (generally 3.9.x):

* Installed python 3.9.13 for MacOS from python.org

* Located the right version of python under usr/local/bin as python3.9

* Used /usr/local/bin/python3.9 -m venv venv to build environment

* We also had to brew install postgresql to install one of the packages.

## More notes on installation (problems Adam encountered)

There was a problem with socketio using python 3.10.?

* Installed python 3.9.13 (same version as Baris) using:

* brew install pyenv

* pyenv install 3.9.13

* pyenv local 3.9.13

* pyenv exec python -m venv venv

* source venv/bin/activate

## To run locally:

* `python hepcat.py` - This lauches the Flask server. Then navigate browser to `http://127.0.0.1:5000`. Log in using one of the test/admin accounts (see `ensure_admin()` in `models.py`). When you visit the React app in that page (after login) you are getting the version compiled by `npm run build` above. 

* In addition, you can get a live React server running too, as follows.

	* Before launching Flask (python, as above), 
	`export ALLOW_CORS=True`.

	* In terminal before you use `npm start` (next step) do: 
	`export REACT_APP_SOCKET_ENDPOINT=http://127.0.0.1:5000/` 
	(or whatever the port Flask is running on). Also `export HOST="localhost"` and `export REACT_APP_SHOW_LOGS=True` (if you want to see console logs) and `export REACT_APP_ABOUT_IMAGE_PREFIX="http://localhost:3000/about"` (if you want images to show in the about page).

	* Now, while Flask server is running, you can also use `npm start` to launch a React server to serve the React app, and it will connect by socketio to the Flask server (CORS required). 
	
	* To get to the live-updating React app, navigate browser to `http://127.0.0.1:3000`.

* If you don't specify the database URL it writes a local SQL file-based database. Or you can connect to a local Postgres database via:  `DEV_DATABASE_URL=postgresql://localhost`. (AF tested on Mac with Postgres Version 2.5.6.)

## Local database options

* To get local sqlite file, don't set `DEV_DATABASE_URL`
* For postgres: `export DEV_DATABASE_URL=postgresql://localhost`
* Wipe out: rm data-dev.sqlite

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
* `HEPCAT_USE_ORTOOLS=True`

Then:

```
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add heroku/python
heroku buildpacks
git push heroku
```

## To generate fake data

```
cd fake
python3 -m venv venv-fake
source venv-fake/bin/activate
python -m pip install --upgrade pip
pip install numpy faker
python fake.py
```

## To drop all tables in local Postgres

```
\dt (<==shows tables)
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS conflicts CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS file_upload CASCADE;
DROP TABLE IF EXISTS glob_queue CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
```

(To do so at Heroku, log into Heroku panel and find the spot in settings for that database.)
