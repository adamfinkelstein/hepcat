# Hepcat project source tree

This is the source code for the Hepcat project. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH PC meeting.

## Production URLs:

Heroku: `https://hepcat.herokuapp.com/`
Digital Ocean: `https://hepcat.app/`

## Architecture

This app uses the following major components:

- Flask - server
  - SQAlchemy (database)
  - Flask-Login (for authentication)
- React - client
  - Bootstrap for styling/widgets
  - Compiled static version served in production
- Socket.IO - communication between server and client

## To clone and set up locally:

First, you need Postgres. If you skip this step, you will get an error like `pg_config is required to build psycopg2 from source` when doing the pip install below. On mac you can install it several ways, including:

- [Postgres.app](https://postgresapp.com/downloads.html)
- Homebrew `brew install postgresql`
- Build from source (probably slower)

Next this works, at least in python version 3.9.13 (generally 3.9.x -- note that Python 3.9.13 is what is specified in runtime.txt):

```
git clone https://github.com/adamfinkelstein/hepcat.git
cd hepcat
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

npm install (one time, to set up build directory etc)
npm run build
```

See [this github repo] for how to generate fake data.

## More notes on installation above, for mac:

There was a problem with socketio using python 3.10.x.

```
brew install postgresql
brew install pyenv
pyenv install 3.9.13
pyenv local 3.9.13
pyenv exec python -m venv venv
source venv/bin/activate
python --version
```

## Local database options

- Postgres / SQL [quick notes](https://hasura.io/blog/top-psql-commands-and-flags-you-need-to-know-postgresql/)

- If you don't specify the database URL it writes a local sqlite/SQL file-based database. To wipe it out, do `rm data.sqlite`

- To connect to a local Postgres database via: `DEV_DATABASE_URL=postgresql://localhost`
  (AF tested on Mac with Postgres Version 2.5.6.)

## To run locally with static build:

- If you plan to use Postgres, start that server and set environment variable (see above).
- If you made changes to the React app, first run `npm run build`.
- Run `python hepcat.py` - This launches the Flask server.
- Navigate browser to `http://127.0.0.1:5000` (not localhost, which gives a 503 error for some reason?) The Flask server serves the files compiled by `npm` into the build folder.
- Log in using one of the test/admin accounts (see config variables).

## To run locally using npm to serve React:

- In one terminal run Flask server:

```
export ALLOW_CORS=True
python hepcat.py
```

- In another terminal run React server:

```
# no longer needed:
# export HOST="http://127.0.0.1"
# export REACT_APP_SOCKET_ENDPOINT="http://127.0.0.1:5000/"

# optional, to show logs in console
export REACT_APP_SHOW_LOGS=True

npm start
```

- Now navigate browser to `http://127.0.0.1:3000`

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

- `SECRET_KEY` (change resets all hepcat local store inc acts)
- `SQLALCHEMY_DATABASE_URI` (to the postgres database)
- `FLASK_CONFIG=production` (should default in code)

** See longer list in config.py **

Finally, after sending local changes, deploy at Heroku like this:

```
git push heroku
```

Later these commands appears to restart Heroku app, but not clear if it picks up changes to environment vars:

```
heroku maintenance:on
heroku restart
heroku maintenance:off
```

## To perform simulation test with many fake users connecting on sockets:

Note this text modified from [here](https://github.com/adamfinkelstein/hepcat/pull/12).

Initial attempt at a user simulation script.

Examples of usage:

```
python tests/fakeclients.py -w 3 -t 4 http://127.0.0.1:5000 tests/test-data/users.csv
python tests/fakeclients.py -w 3 -t 4 https://hepcat.herokuapp.com tests/test-data/users.csv
```

This runs a user simulation with three worker processes (`-w 3`), each with four client threads (`-t 4`). For this example to work, the `users.csv` file must have at least 12 users. If there aren't enough users for the requested concurrency, the script ends with an error message.

Each thread within each worker process will connect to the server running at the URL given. Some random waits are included, so that not all clients connect at the same time. Once connected, each client will wait for a random amount of time and then disconnect and reconnect, this time using the token that was returned by the user on the first connection. When the script is left running, there is going to be a constant stream of clients going away and returning a few seconds later, as if they were refreshing their browsers. If you log in as the super administrator, you can operate the server and see messages as they are pushed to clients. The clients log all received messages, but other than looking for the reconnection token they ignore all received messages.
