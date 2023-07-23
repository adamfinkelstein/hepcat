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


Next this works, at least in python version 3.9.13 (generally 3.9.x -- note that Python 3.9.13 is what is specified in runtime.txt):

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

## Baris' notes on installation above

This works in python version 3.9.13 (generally 3.9.x):

* Installed python 3.9.13 for MacOS from python.org

* Located the right version of python under usr/local/bin as python3.9

* Used /usr/local/bin/python3.9 -m venv venv to build environment

* We also had to brew install postgresql to install one of the packages.

## Adam's notes on installation above

There is a problem with socketio using python 3.10.xx. Instead install python 3.9.13 (same version as Baris) using:

```
brew install pyenv
pyenv install 3.9.13
pyenv local 3.9.13
pyenv exec python -m venv venv
source venv/bin/activate
python --version
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

## Local database options

* Postgress / SQL [quick notes](https://hasura.io/blog/top-psql-commands-and-flags-you-need-to-know-postgresql/)

* If you don't specify the database URL it writes a local sqlite/SQL file-based database. To wipe it out, do `rm data-dev.sqlite`

* To connect to a local Postgres database via:  `DEV_DATABASE_URL=postgresql://localhost`
(AF tested on Mac with Postgres Version 2.5.6.)

## To drop all tables in local Postgres

```
\dt (<==shows tables)
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS conflicts CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS glob_queues CASCADE;
DROP TABLE IF EXISTS labels CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS queries CASCADE;
```

(To do so at Heroku, log into Heroku panel and find the spot in settings for that database.)

## To run locally with static build:

* If you plan to use Postgres, start that server and set environment variable (see above).
* If you made changes to the React app, first run `npm run build`.
* Run `python hepcat.py` - This lauches the Flask server. 
* Navigate browser to `http://127.0.0.1:5000` (not localhost, which gives a 503 error for some reason?!?) The Flask server serves the files compiled by `npm` into the build folder.
* Log in using one of the test/admin accounts (see `ensure_admin()` in `models.py`).

## To run locally using npm to serve React:

* In one terminal run Flask server:

```
export ALLOW_CORS=True
python hepcat.py
```

* In another terminal run React server:

```
export HOST="localhost"
export REACT_APP_SOCKET_ENDPOINT="http://127.0.0.1:5000/"
export REACT_APP_SHOW_LOGS=True
export REACT_APP_ABOUT_IMAGE_PREFIX="http://localhost:3000/about/"
npm start
```

* Now navigate browser to `http://127.0.0.1:3000`


## To set up Heroku:

Set up Heroku app and add it to git remotes:

```
(venv) hepcat> heroku git:remote -a hepcat
set git remote heroku to https://git.heroku.com/hepcat.git
(venv) hepcat> git remote -v
heroku  https://git.heroku.com/hepcat.git (fetch)
heroku  https://git.heroku.com/hepcat.git (push)
origin  https://github.com/adamfinkelstein/hepcat.git (fetch)
origin  https://github.com/adamfinkelstein/hepcat.git (push)
```

One time you need to set up buildpacks for the project at Heroku, like this:

```
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add heroku/python
heroku buildpacks
```

Also set environment variables at Heroku, at least:

* `SECRET_KEY` (change resets all hepcat local store inc acts)
* `DATABASE_URL_HEROKU` (to the postgres database)
* `FLASK_CONFIG=production` (later, make this default in code)
* `HEPCAT_ADMIN_LOGIN`
* `HEPCAT_ADMIN_PASSWD`
* `HEPCAT_CHAIR_LOGIN`
* `HEPCAT_CHAIR_PASSWD`
* `HEPCAT_USE_ORTOOLS=True`
* `ZOOM_CONFLICTBOT_CLIENT_ID`
* `ZOOM_CONFLICTBOT_CLIENT_SECRET`
* `HEPCAT_CONFLICTBOT_SOCKET`
* `REACT_APP_PING_TIMER_SECS` (unset or 0 means no pings)

** AF should check this list at Heroku and see if more updates are needed. **

Finally, after sending local changes, deploy at Heroku like this:

```
git push heroku
```

This appears to restart Heroku app but not clear if it picks up changes to environment vars:

```
heroku maintenance:on
heroku restart
heroku maintenance:off
```

