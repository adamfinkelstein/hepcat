from tests.hepcat_test_case import HepcatTestCase
from app.models.tables import User, Paper, Action
from app import db
from flask import current_app
import time


class TestDecoratorsViaSocketEvents(HepcatTestCase):
    """Test decorators through actual socket events using known test data"""

    def setUp(self):
        """Ensure that entities required for these tests exist in the db"""
        super().setUp()

        # Use known test users - assert they exist
        test_users = ["citizen", "admin", "super"]
        for user in test_users:
            email = f"fake.{user}@example.com"
            err = f"User {email} not found in test data"
            user = User.query.filter_by(email=email).first()
            self.assertIsNotNone(user, err)

            if email == "fake.admin@example.com":
                err = f"{email} should be admin"
                self.assertTrue(user.role_is_admin, err)
            elif email == "fake.super@example.com":
                err = "fake.super should be super"
                self.assertTrue(user.role_is_super, err)

        err = "Paper 110 not found in test data"
        paper = Paper.query.filter_by(nid=110).first()
        self.assertIsNotNone(paper, err)

        # Ensure that action recording is enabled for tests
        current_app.config["HEPCAT_RECORD_ADMIN"] = True
        action_count = Action.query.count()
        self.assertEqual(action_count, 0)

    def test_admin_required_with_record_decorator(self):
        """Test @admin_required_for_io_with_record through admin_set_bar event"""

        # Test 1: Regular user fails on admin actions
        err = "Regular user should be disconnected for admin action"
        client = self.login(email="fake.citizen@example.com")
        client.get_received()  # flush
        client.emit("admin_set_bar", 0.5)
        time.sleep(0.1)  # wait for disconnect
        self.assertFalse(client.is_connected(), err)

        err = "No action should be recorded for unauthorized user"
        action_count = Action.query.count()
        self.assertEqual(action_count, 0, err)

        # Test 2: Admin user succeeds and action recorded
        err = "Admin user should be remain connected for admin action"
        client = self.login(email="fake.admin@example.com")
        client.get_received()  # flush
        client.emit("admin_set_bar", 0.5)
        time.sleep(0.1)  # wait for possible disconnect
        self.assertTrue(client.is_connected(), err)

        err = "Admin should receive response"
        events = client.get_received()
        self.assertGreater(len(events), 0, err)
        client.disconnect()

        err = "Admin action should be recorded"
        actions = Action.query.all()
        self.assertEqual(len(actions), 1, err)

        err = "Admin action properties did not match"
        action = actions[0]
        self.assertEqual(action.func_name, "admin_set_bar", err)
        self.assertEqual(action.email, "fake.admin@example.com", err)
        self.assertIn("0.5", action.args_json, err)

    def test_admin_required_no_record_decorator(self):
        """Test @admin_required_for_io_no_record through admin_load_filter event"""

        err = "Regular user should be disconnected on admin action"
        client = self.login(email="fake.citizen@example.com")
        client.get_received()
        client.emit("admin_load_filter", "nonexistent_filter")
        time.sleep(0.1)
        self.assertFalse(client.is_connected(), err)

        err = "Admin should stay connected on admin action"
        client = self.login(email="fake.admin@example.com")
        client.get_received()
        client.emit("admin_load_filter", "nonexistent_filter")
        time.sleep(0.1)
        client.get_received()
        self.assertTrue(client.is_connected(), err)
        client.disconnect()

        err = "admin_load_filter should not be recorded"
        action_count = Action.query.count()
        self.assertEqual(action_count, 0, err)

    def test_login_required_decorator(self):
        """Test @login_required_for_io through user_set_sticky event"""

        client = self.login(email="fake.citizen@example.com")

        sticky_data = {
            "nid": 110,  # Known test paper
            "status": "Accept",
            "key": "test_login_key",
        }

        client.get_received()
        client.emit("user_set_sticky", sticky_data)
        events = client.get_received()

        # Should succeed - user is logged in
        self.assertTrue(client.is_connected())
        self.assertGreater(len(events), 0)

        # Should get sticky confirmation
        confirm_events = [e for e in events if e["name"] == "server_confirm_sticky"]
        self.assertEqual(len(confirm_events), 1)

        client.disconnect()

    def test_get_user_or_disconnect_decorator(self):
        """Test @get_user_or_disconnect through user_request_grid event"""

        client = self.login(email="fake.citizen@example.com")
        client.get_received()
        client.emit("user_request_grid")
        events = client.get_received()

        # Should succeed and get grid
        self.assertTrue(client.is_connected())
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["name"], "server_set_grid")

        # Verify grid has expected structure
        grid_data = events[0]["args"][0]
        self.assertIn("papers_encrypted", grid_data)
        self.assertIn("bar", grid_data)

        client.disconnect()


"""
Cannot test super_required_for_io through admin_wipe_database
because (a) it wipes the database, and (b) it disconnects everyone
regardless of success or failure.

Could attempt to test playback_recorded_actions, but does not
seem important, since that feature is just for debugging and
not really used in practice.
"""
