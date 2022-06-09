import os
# import click
# from flask_migrate import Migrate
from app import create_app, db, socketio
from app.models import User, Role

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

# AF removed some things here about migrations and shell contexts
if __name__ == '__main__':
    socketio.run(app)
