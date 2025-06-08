import os
import shutil
import unittest
from app import create_app, db, socketio
from app.uploads.insert import read_csv

########
#
# Caching strategy for database reuses the same clean db over and over.
#
########

# Two db files used during testing:
# test_db contains the data during a test
# temp_db is a clean template copy, copied over test_db in each test
test_db = "test.sqlite"
temp_db = "temp.sqlite"


def templateExists():
    return os.path.exists(temp_db)


def copyCleanTestDBToTemplate():
    shutil.copy2(test_db, temp_db)


def copyTemplateToTestDB():
    shutil.copy2(temp_db, test_db)


class HepcatTestCase(unittest.TestCase):
    def createApp(self):
        # create an app
        build_path = os.getcwd() + "/build"
        self.app = create_app("testing", build_path)
        self.app_ctx = self.app.app_context()
        self.app_ctx.push()

    def populateDB(self):
        read_csv("tests/test-data/users.csv")
        read_csv("tests/test-data/papers.csv")
        read_csv("tests/test-data/conflicts.csv")
        read_csv("tests/test-data/clusters.csv")
        read_csv("tests/test-data/chair.csv")
        read_csv("tests/test-data/history.csv")
        db.session.commit()

    def setUp(self):
        """Implements db caching strategy described above."""
        exists = templateExists()
        if exists:
            copyTemplateToTestDB()
        self.createApp()
        if not exists:
            self.populateDB()
            copyCleanTestDBToTemplate()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_ctx.pop()

    def login(self, email="fake.citizen@example.com", password="pass"):
        if not hasattr(self, "client"):
            self.client = self.app.test_client()
        client = socketio.test_client(
            self.app,
            auth={"email": email, "password": password},
            flask_test_client=self.client,
        )
        assert client.is_connected()
        return client

    def login_regular(self):
        return self.login()

    def login_admin(self):
        return self.login(email="fake.admin@example.com")

    def login_super(self):
        return self.login(email="fake.super@example.com")
