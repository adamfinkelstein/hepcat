from tests.hepcat_test_case import HepcatTestCase
from app.models.tables import User, Paper, Action
from app import db
from flask import current_app
import time


class TestDecoratorsViaSocketEvents(HepcatTestCase):
    """Test decorators through actual socket events using known test data"""

    def setUp(self):
        super().setUp()

        # Use known test users - assert they exist
        self.regular_user = User.query.filter_by(
            email="fake.citizen@example.com"
        ).first()
        self.assertIsNotNone(
            self.regular_user, "fake.citizen@example.com not found in test data"
        )

        self.admin_user = User.query.filter_by(email="fake.admin@example.com").first()
        self.assertIsNotNone(
            self.admin_user, "fake.admin@example.com not found in test data"
        )
        self.assertTrue(self.admin_user.role_is_admin, "fake.admin should be admin")

        self.super_user = User.query.filter_by(email="fake.super@example.com").first()
        self.assertIsNotNone(
            self.super_user, "fake.super@example.com not found in test data"
        )
        self.assertTrue(
            self.super_user.role_is_super, "fake.super should be super user"
        )

        self.chair_user = User.query.filter_by(email="fake.chair@example.com").first()
        self.assertIsNotNone(
            self.chair_user, "fake.chair@example.com not found in test data"
        )

        # Use known test paper
        self.test_paper = Paper.query.filter_by(nid=110).first()
        self.assertIsNotNone(self.test_paper, "Paper 110 not found in test data")

        # Enable action recording for tests
        current_app.config["HEPCAT_RECORD_ADMIN"] = True

    def test_admin_required_with_record_decorator(self):
        """Test @admin_required_for_io_with_record through admin_set_bar event"""

        # Clear existing actions to get clean count
        Action.query.delete()
        db.session.commit()
        initial_action_count = Action.query.count()
        self.assertEqual(initial_action_count, 0)

        # Test 1: Regular user should be disconnected
        regular_client = self.login(email="fake.citizen@example.com", password="pass")
        regular_client.get_received()
        regular_client.emit("admin_set_bar", 5.0)

        time.sleep(0.1)
        self.assertFalse(
            regular_client.is_connected(),
            "Regular user should be disconnected when trying admin event",
        )

        # No action should be recorded for failed attempt
        failed_action_count = Action.query.count()
        self.assertEqual(
            failed_action_count, 0, "No action should be recorded for unauthorized user"
        )

        # Test 2: Admin user should succeed and action should be recorded
        admin_client = self.login(email="fake.admin@example.com", password="pass")
        admin_client.get_received()
        admin_client.emit("admin_set_bar", 6.0)
        events = admin_client.get_received()

        self.assertTrue(admin_client.is_connected(), "Admin should stay connected")
        self.assertGreater(len(events), 0, "Admin should receive response")

        # Check action was recorded
        db.session.commit()  # Ensure any pending commits are done
        recorded_actions = Action.query.all()
        self.assertEqual(len(recorded_actions), 1, "Admin action should be recorded")

        action = recorded_actions[0]
        self.assertEqual(action.func_name, "admin_set_bar")
        self.assertEqual(action.email, "fake.admin@example.com")
        self.assertIn("6.0", action.args_json)

        admin_client.disconnect()

    def test_admin_required_no_record_decorator(self):
        """Test @admin_required_for_io_no_record through admin_load_filter event"""

        # Clear actions
        Action.query.delete()
        db.session.commit()

        # Test 1: Regular user should be disconnected
        regular_client = self.login(email="fake.citizen@example.com", password="pass")
        regular_client.get_received()
        regular_client.emit("admin_load_filter", "nonexistent_filter")

        time.sleep(0.1)
        self.assertFalse(
            regular_client.is_connected(), "Regular user should be disconnected"
        )

        # Test 2: Admin user should succeed
        admin_client = self.login(email="fake.admin@example.com", password="pass")
        admin_client.get_received()
        admin_client.emit("admin_load_filter", "nonexistent_filter")
        events = admin_client.get_received()

        self.assertTrue(admin_client.is_connected(), "Admin should stay connected")

        # No action should be recorded (this decorator doesn't record)
        db.session.commit()
        action_count = Action.query.count()
        self.assertEqual(action_count, 0, "admin_load_filter should not be recorded")

        admin_client.disconnect()

    def test_super_required_decorator(self):
        """Test @super_required_for_io through admin_wipe_database event"""

        # Test 1: Regular user should be disconnected
        regular_client = self.login(email="fake.citizen@example.com", password="pass")
        regular_client.get_received()
        regular_client.emit("admin_wipe_database")

        time.sleep(0.1)
        self.assertFalse(
            regular_client.is_connected(), "Regular user should be disconnected"
        )

        # Test 2: Admin (non-super) should be disconnected
        admin_client = self.login(email="fake.admin@example.com", password="pass")
        admin_client.get_received()
        admin_client.emit("admin_wipe_database")

        time.sleep(0.1)
        self.assertFalse(
            admin_client.is_connected(), "Non-super admin should be disconnected"
        )

        # Test 3: Super user should be allowed through
        # Note: We won't actually test this because admin_wipe_database
        # would destroy our test data, but the decorator should allow it

        # Test with a different super-only event if available, or just verify super user exists
        self.assertTrue(
            self.super_user.role_is_super, "Super user should have super privileges"
        )

    def test_login_required_decorator(self):
        """Test @login_required_for_io through user_set_sticky event"""

        regular_client = self.login(email="fake.citizen@example.com", password="pass")

        sticky_data = {
            "nid": 110,  # Known test paper
            "status": "Accept",
            "key": "test_login_key",
        }

        regular_client.get_received()
        regular_client.emit("user_set_sticky", sticky_data)
        events = regular_client.get_received()

        # Should succeed - user is logged in
        self.assertTrue(regular_client.is_connected())
        self.assertGreater(len(events), 0)

        # Should get sticky confirmation
        confirm_events = [e for e in events if e["name"] == "server_confirm_sticky"]
        self.assertEqual(len(confirm_events), 1)

        regular_client.disconnect()

    def test_get_user_or_disconnect_decorator(self):
        """Test @get_user_or_disconnect through user_request_grid event"""

        regular_client = self.login(email="fake.citizen@example.com", password="pass")
        regular_client.get_received()
        regular_client.emit("user_request_grid")
        events = regular_client.get_received()

        # Should succeed and get grid
        self.assertTrue(regular_client.is_connected())
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["name"], "server_set_grid")

        # Verify grid has expected structure
        grid_data = events[0]["args"][0]
        self.assertIn("papers_encrypted", grid_data)
        self.assertIn("bar", grid_data)

        regular_client.disconnect()

    def test_user_revoke_sticky_decorator(self):
        """Test decorator on user_revoke_sticky (uses @login_required_for_io)"""

        regular_client = self.login(email="fake.citizen@example.com", password="pass")

        # First set a sticky
        sticky_data = {"nid": 110, "status": "Reject", "key": "revoke_test_key"}

        regular_client.emit("user_set_sticky", sticky_data)
        regular_client.get_received()  # clear buffer

        # Now revoke it
        revoke_data = {"nid": 110, "key": "revoke_test_key"}

        regular_client.emit("user_revoke_sticky", revoke_data)
        events = regular_client.get_received()

        # Should succeed
        self.assertTrue(regular_client.is_connected())
        self.assertGreater(len(events), 0)

        regular_client.disconnect()

    def test_action_recording_with_multiple_admin_events(self):
        """Test action recording with sequence of admin events"""

        # Clear actions
        Action.query.delete()
        db.session.commit()

        admin_client = self.login(email="fake.admin@example.com", password="pass")

        # Perform multiple recordable admin actions
        recordable_events = [
            ("admin_set_bar", 5.5),
            ("admin_show_current", "Plenary"),
            ("admin_set_queue_by_gui", {"roomChoice": "Plenary", "scoreMin": 0}),
        ]

        for event_name, event_data in recordable_events:
            admin_client.get_received()
            admin_client.emit(event_name, event_data)
            admin_client.get_received()

        db.session.commit()

        # Check that actions were recorded
        recorded_actions = Action.query.all()
        recorded_func_names = [a.func_name for a in recorded_actions]

        # All events with @admin_required_for_io_with_record should be recorded
        expected_recorded = [
            "admin_set_bar",
            "admin_show_current",
            "admin_set_queue_by_gui",
        ]

        for expected in expected_recorded:
            self.assertIn(
                expected, recorded_func_names, f"{expected} should have been recorded"
            )

        # Check specific action details
        bar_action = next(a for a in recorded_actions if a.func_name == "admin_set_bar")
        self.assertEqual(bar_action.email, "fake.admin@example.com")
        self.assertIn("5.5", bar_action.args_json)

        admin_client.disconnect()

    def test_admin_become_user_authorization_change(self):
        """Test admin_become_user and subsequent authorization changes"""

        admin_client = self.login(email="fake.admin@example.com", password="pass")

        # Admin should be able to call admin events
        admin_client.get_received()
        admin_client.emit("admin_set_bar", 7.0)
        events = admin_client.get_received()
        self.assertTrue(admin_client.is_connected())
        self.assertGreater(len(events), 0)

        # Now become regular user
        admin_client.get_received()
        admin_client.emit("admin_become_user", "fake.citizen@example.com")
        events = admin_client.get_received()

        # Should get welcome message as new user
        welcome_events = [e for e in events if e["name"] == "server_welcome"]
        self.assertEqual(len(welcome_events), 1)
        welcome_data = welcome_events[0]["args"][0]
        self.assertEqual(welcome_data["user"]["email"], "fake.citizen@example.com")

        # Now try admin event as regular user - should be disconnected
        admin_client.get_received()
        admin_client.emit("admin_set_bar", 8.0)

        time.sleep(0.1)
        self.assertFalse(
            admin_client.is_connected(),
            "Should be disconnected after trying admin event as regular user",
        )

    def test_chair_user_admin_access(self):
        """Test that chair user has admin privileges"""

        # Chair should be able to call admin events
        chair_client = self.login(email="fake.chair@example.com", password="pass")
        chair_client.get_received()
        chair_client.emit("admin_set_bar", 4.5)
        events = chair_client.get_received()

        self.assertTrue(chair_client.is_connected(), "Chair should have admin access")
        self.assertGreater(len(events), 0)

        chair_client.disconnect()

    def test_user_change_password_decorator(self):
        """Test @get_user_or_disconnect on user_change_password event"""

        regular_client = self.login(email="fake.citizen@example.com", password="pass")

        password_data = {
            "oldPassword": "pass",
            "password": "new_password",
            "forEmail": None,  # changing own password
        }

        regular_client.get_received()
        regular_client.emit("user_change_password", password_data)
        events = regular_client.get_received()

        self.assertTrue(regular_client.is_connected())
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["name"], "server_send_flasher")

        # Should be success message
        flasher_data = events[0]["args"][0]
        self.assertEqual(flasher_data["type"], "success")

        regular_client.disconnect()

    def test_multiple_users_same_event(self):
        """Test decorator behavior with multiple concurrent users"""

        # Connect multiple users
        regular_client = self.login(email="fake.citizen@example.com", password="pass")
        admin_client = self.login(email="fake.admin@example.com", password="pass")

        # Both request grid (uses @get_user_or_disconnect)
        regular_client.get_received()
        admin_client.get_received()

        regular_client.emit("user_request_grid")
        admin_client.emit("user_request_grid")

        regular_events = regular_client.get_received()
        admin_events = admin_client.get_received()

        # Both should succeed
        self.assertTrue(regular_client.is_connected())
        self.assertTrue(admin_client.is_connected())
        self.assertEqual(len(regular_events), 1)
        self.assertEqual(len(admin_events), 1)

        regular_client.disconnect()
        admin_client.disconnect()
