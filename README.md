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

## To clone and set up locally:

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

## To run locally, allowing live edit of client code:

- In one terminal, run Flask server:

```
python hepcat.py
```

- In another terminal, run React server:

```
nvm use 22
npm start
```

- Now navigate browser to `http://127.0.0.1:3000`

## To create or update requirements.txt:

```
source venv/bin/activate
pip install pip-tools
pip-compile --strip-extras requirements.in
pip install -r requirements.txt
```

## More details

- [About testing](tests/README.md)
- [About installing](config-external/README.md)
