# Hepcat

This is the source code for the Hepcat application. This software is used to help guide the discussion and manage conflicts during the
[ACM SIGGRAPH](https://www.siggraph.org) Technical Papers Program Committee (PC) meeting.

This document mainly describes how to install and launch the app. To learn more about the goals and how to use the app, see the
[User's Guide](https://docs.google.com/document/d/e/2PACX-1vTooKgBrn5p5NGoXrnf6eAoLMRZPJRTOaSRR-fb4lvv1aDAEFoI4u__2MMFoOwQuBf4mg8DUcAtwO5t/pub) and the
[Chair's Guide](https://docs.google.com/document/d/e/2PACX-1vQsBC3jH0S5Gk4YAiuHnEgxR6xcaR_aSOtDClXHOCEQwB1L3zWhavBcyl4BUNTkftm4ocZ3GvwJveIa/pub).

## Architecture

This app uses the following major components:

- Flask - server
  - SQAlchemy (database)
- React - client
  - Bootstrap for styling/widgets
  - Compiled static version served in production
- Socket.IO - communication between server and client

## Local setup with static build of client:

In a terminal:

```
git clone https://github.com/adamfinkelstein/hepcat.git
cd hepcat

pyenv local 3.12
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

nvm use 22
npm install (one time, to set up build directory etc)
npm run build
```

Next to run the app locally:

- `python hepcat.py`
- Now navigate browser to <http://127.0.0.1:5000>

## Local setup allowing live code edits at client:

- First, do the local setup above.
- Next, in one terminal, run Flask server:

```
python hepcat.py
```

- Finally, in another terminal, run React server, via Vite:

```
nvm use 22
npm start
```

- Now navigate browser to `http://127.0.0.1:3000`
- You should be able to log in using email `chair@example.com` and the default password 'pass' -- or whatever is set in the environment / configuration (see below).
- Note that in this 'live code' configuration of the client, the downloads feature will not work. To test downloads, use the static built option above.

## To create or update requirements.txt:

After Local Setup above:

```
source venv/bin/activate
pip install pip-tools
pip-compile --strip-extras requirements.in
pip install -r requirements.txt
```

## Configuration variables

There are many configuration variables with reasonable defaults set in `config.py`. These can be overridden by environment variables set in the shell or in a `.env` file. In development on a local machine, no variables need to be set - the defaults are fine.

Some variables (like email keys) are necessary at the running server, and these are noted in the example file
[dotenv-example.txt](config-external/dotenv-example.txt).

Before loading any data into Hepcat, there are no user accounts set up. Hepcat automatically populates a few accounts like `chair@example.com` with a default password set in the config.

**HTTPS and CORS**:
The live production server should require HTTPS connections and disable CORS. In development on your local host it is helpful to use HTTP and enable CORS. Environment variables are set up this way by default.

## Database Setup

**Database Configuration**

The database location can be customized using the `SQLALCHEMY_DATABASE_URI` environment variable:

- **Development**: Uses SQLite by default (local file `data.sqlite`).
- **Production**: Currently uses SQLite on our own server.
- **Previous versions**: When hosted at Heroku, we used cloud-based PostgreSQL via Heroku plugins.

**Automatic Database Creation**
Hepcat automatically creates a fresh SQLite database when you first run the application.

**No Database Migrations**
Unlike typical web applications, Hepcat intentionally does not use database migrations. Why? Hepcat is designed for ACM SIGGRAPH PC meetings, used twice yearly for SIGGRAPH and SIGGRAPH Asia. Each PC meeting uses completely independent data. So we start fresh for every conference, rather than preserving data across meetings.

**Resetting the Database**
To reset or recreate the database (useful during development or between meetings):

1. Stop the application
2. Delete the database (e.g., delete local file `data.sqlite`)
3. Restart the application - a new database will be created automatically.

## Improved optimization using Concorde

Out of the box, Hepcat uses Google [OR Tools](https://developers.google.com/optimization) for optimizing the order of papers in the queue. However, we have found that the [Concorde](https://www.math.uwaterloo.ca/tsp/concorde.html) solver generally produces better solutions, and much more quickly (for large queues). To use Concorde, build or obtain a copy of the executable and place it in the directory `bin_local` (or whatever directory you specify in the config variable `BIN_FOLDER`). The name of the executable should be like `concorde.Darwin.arm64` or `concorde.Linux.x86_64` -- or set in the config variable `CONCORDE_EXE`.

## More information

- [Security model](./SECURITY.md)
- [About testing](tests/README.md)
- [Production install](config-external/README.md)
- [How to contribute](./CONTRIBUTING.md)
- [Project history](./CONTRIBUTORS.md)
