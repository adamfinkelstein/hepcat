import os
import unittest
from app import create_app, db, socketio
from app.uploads import read_csv


class HepcatTestCase(unittest.TestCase):
    def setUp(self):
        # create an app
        build_path = os.getcwd() + "/build"
        self.app = create_app("testing", build_path)
        self.client = self.app.test_client()
        self.app_ctx = self.app.app_context()
        self.app_ctx.push()

        # create a test database
        db.create_all()
        read_csv("tests/test-data/users.csv")
        read_csv("tests/test-data/papers.csv")
        read_csv("tests/test-data/conflicts.csv")
        read_csv("tests/test-data/clusters.csv")
        read_csv("tests/test-data/paper_rooms.csv")
        read_csv("tests/test-data/people_rooms.csv")
        read_csv("tests/test-data/chair.csv")
        read_csv("tests/test-data/history.csv")

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_ctx.pop()

    def login(self, email="bradley.williams@example.com", password="pass"):
        client = socketio.test_client(
            self.app,
            auth={"email": email, "password": password},
            flask_test_client=self.client,
        )
        assert client.is_connected()
        return client
