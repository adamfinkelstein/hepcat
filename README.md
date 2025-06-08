# Hepcat

This is the source code for the Hepcat application. This software is used to help guide the discussion and manage conflicts during the ACM SIGGRAPH Technical Papers Program Committee meeting.

## Architecture

This app uses the following major components:

- Flask - server
  - SQAlchemy (database)
- React - client
  - Bootstrap for styling/widgets
  - Compiled static version served in production
- Socket.IO - communication between server and client

## Local Setup:

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

## Run locally, while allowing live code edits:

- First, do the local setup above.
- Next, in one terminal, run Flask server:

```
python hepcat.py
```

- Finally, in another terminal, run React server:

```
nvm use 22
npm start
```

- Now navigate browser to `http://127.0.0.1:3000`
- You should be able to log in using email `chair@example.com` and the password set in the environment / configuration (see below).

## To create or update requirements.txt:

After Local Setup above:

```
source venv/bin/activate
pip install pip-tools
pip-compile --strip-extras requirements.in
pip install -r requirements.txt
```

## Configuration variables

There are many configuration variables with reasonable defaults set in `config.py`. These can be overridden by environment variables set in the shell or in a `.env` file.

Some variables (like email keys) are necessary at the running server, and these are noted in the example file `config-external/dotenv-example.txt`.

Before loading any data into Hepcat, there are no user accounts set up. Hepcat automatically populates a few accounts like `chair@example.com` with a default password set in the config.

## Improved optimization using Concorde

Out of the box, Hepcat uses Google [OR Tools](https://developers.google.com/optimization) for optimizing the order of papers in the queue. However, we have found that the [Concorde](https://www.math.uwaterloo.ca/tsp/concorde.html) solver generally produces better solutions, and much more quickly (for large queues). To use Concorde, build or obtain a copy of the executable and place it in the directory `bin_local` (or whatever directory you specify in the config variable `BIN_FOLDER`). The name of the executable should be like `concorde.Darwin.arm64` or `concorde.Linux.x86_64` -- or set in the config variable `CONCORDE_EXE`.

## More details

- [About testing](tests/README.md)
- [About installing](config-external/README.md)
