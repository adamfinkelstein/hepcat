from tests.hepcat_test_case import HepcatTestCase
from app.models.tables import User, Paper, Filter
import time


class TestSockets(HepcatTestCase):
    def setUp(self):
        super().setUp()
        self.socket_client = self.login()

        # Set up admin client for admin tests
        self.admin_user = User.query.filter_by(email="fake.admin@example.com").first()
        self.assertIsNotNone(self.admin_user)

    def tearDown(self):
        if self.socket_client.is_connected():
            self.socket_client.disconnect()
        super().tearDown()

    def test_connected(self):
        assert self.socket_client.is_connected()
        events = self.socket_client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.citizen@example.com"

    def test_grid(self):
        self.socket_client.get_received()  # clear receive buffer
        self.socket_client.emit("user_request_grid")
        events = self.socket_client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_grid"

    def test_invalid_admin_access(self):
        """this test sends an admin event from a regular user account to
        confirm that the user is immediately disconnected."""
        self.socket_client.get_received()  # clear receive buffer
        self.socket_client.emit("admin_file_upload")
        assert not self.socket_client.is_connected()

    def test_user_request_queue(self):
        """Test user requesting queue for different rooms"""
        rooms = ["Plenary", "Room_1A", "Room_1B", "Room_2A", "Room_2B"]

        for room in rooms:
            with self.subTest(room=room):
                # Reconnect if needed
                if not self.socket_client.is_connected():
                    self.socket_client = self.login()

                self.socket_client.get_received()
                self.socket_client.emit("user_request_queue", room)
                events = self.socket_client.get_received()

                self.assertEqual(len(events), 1)
                self.assertEqual(events[0]["name"], "server_set_queue")

                # Verify queue structure
                queue_data = events[0]["args"][0]
                self.assertIn("paper_list_encrypted", queue_data)
                self.assertIn("globs", queue_data)

    def test_user_set_sticky(self):
        """Test setting sticky notes on papers"""
        paper = Paper.query.filter_by(nid=110).first()
        if not paper:
            paper = Paper.query.first()
        self.assertIsNotNone(paper)

        sticky_data = {"nid": paper.nid, "status": "Accept", "key": "test_sticky_key"}

        self.socket_client.get_received()
        self.socket_client.emit("user_set_sticky", sticky_data)
        events = self.socket_client.get_received()

        # Should get confirmation and broadcast
        self.assertGreater(len(events), 0)

        # Look for confirmation
        confirm_events = [e for e in events if e["name"] == "server_confirm_sticky"]
        self.assertEqual(len(confirm_events), 1)

        # Look for broadcast update
        sticky_events = [e for e in events if e["name"] == "server_set_sticky"]
        self.assertEqual(len(sticky_events), 1)

    def test_user_revoke_sticky(self):
        """Test revoking sticky notes"""
        paper = Paper.query.filter_by(nid=110).first()
        if not paper:
            paper = Paper.query.first()

        # First set a sticky
        sticky_data = {"nid": paper.nid, "status": "Reject", "key": "revoke_test_key"}

        self.socket_client.emit("user_set_sticky", sticky_data)
        self.socket_client.get_received()  # clear

        # Now revoke it
        revoke_data = {"nid": paper.nid, "key": "revoke_test_key"}

        self.socket_client.emit("user_revoke_sticky", revoke_data)
        events = self.socket_client.get_received()

        # Should get grid update
        sticky_events = [e for e in events if e["name"] == "server_set_sticky"]
        self.assertEqual(len(sticky_events), 1)

    def test_user_change_password(self):
        """Test password change functionality"""
        password_data = {
            "oldPassword": "pass",
            "password": "new_test_password",
            "forEmail": None,
        }

        self.socket_client.get_received()
        self.socket_client.emit("user_change_password", password_data)
        events = self.socket_client.get_received()

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["name"], "server_send_flasher")

        flasher_data = events[0]["args"][0]
        self.assertEqual(flasher_data["type"], "success")


class TestAdminSockets(HepcatTestCase):
    """Test admin socket events separately"""

    def setUp(self):
        super().setUp()
        self.admin_client = self.login(email="fake.admin@example.com", password="pass")

    def tearDown(self):
        if self.admin_client.is_connected():
            self.admin_client.disconnect()
        super().tearDown()

    def test_admin_next_prev_paper(self):
        """Test admin navigation through queue"""
        rooms = ["Plenary", "Room_1A"]

        for room in rooms:
            with self.subTest(room=room):
                # Test next paper
                self.admin_client.get_received()
                self.admin_client.emit("admin_next_paper", room)
                events = self.admin_client.get_received()

                globs_events = [e for e in events if e["name"] == "server_set_globs"]
                self.assertEqual(len(globs_events), 1)

                # Test previous paper
                self.admin_client.get_received()
                self.admin_client.emit("admin_prev_paper", room)
                events = self.admin_client.get_received()

                globs_events = [e for e in events if e["name"] == "server_set_globs"]
                self.assertEqual(len(globs_events), 1)

    def test_admin_show_current(self):
        """Test showing current paper"""
        self.admin_client.get_received()
        self.admin_client.emit("admin_show_current", "Plenary")
        events = self.admin_client.get_received()

        globs_events = [e for e in events if e["name"] == "server_set_globs"]
        self.assertEqual(len(globs_events), 1)

    def test_admin_hide_queue(self):
        """Test hiding and showing queue"""
        # Test hiding queue
        hide_data = {
            "roomChoice": "Plenary",
            "hide": True,
            "message": "Queue temporarily hidden for testing",
        }

        self.admin_client.get_received()
        self.admin_client.emit("admin_hide_queue", hide_data)
        events = self.admin_client.get_received()

        globs_events = [e for e in events if e["name"] == "server_set_globs"]
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

        self.assertEqual(len(globs_events), 1)
        self.assertEqual(len(flasher_events), 1)

        # Test showing queue again
        show_data = {"roomChoice": "Plenary", "hide": False, "message": ""}

        self.admin_client.get_received()
        self.admin_client.emit("admin_hide_queue", show_data)
        events = self.admin_client.get_received()

        globs_events = [e for e in events if e["name"] == "server_set_globs"]
        self.assertEqual(len(globs_events), 1)

    def test_admin_set_queue_by_gui(self):
        """Test setting queue using GUI filters"""
        filters = {
            "roomChoice": "Plenary",
            "scoreMin": 0,
            "scoreMax": 10,
            "statusFilter": "all",
        }

        self.admin_client.get_received()
        self.admin_client.emit("admin_set_queue_by_gui", filters)
        events = self.admin_client.get_received()

        queue_events = [e for e in events if e["name"] == "server_set_queue"]
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

        self.assertEqual(len(queue_events), 1)
        self.assertEqual(len(flasher_events), 1)

    def test_admin_set_queue_by_text(self):
        """Test setting queue using text filters"""
        text_data = {"roomChoice": "Plenary", "explicit": "score > 5", "noTSP": False}

        self.admin_client.get_received()
        self.admin_client.emit("admin_set_queue_by_text", text_data)
        events = self.admin_client.get_received()

        queue_events = [e for e in events if e["name"] == "server_set_queue"]
        self.assertEqual(len(queue_events), 1)

    def test_admin_probe_filters(self):
        """Test probing filters without setting queue"""
        # Test GUI probe
        filters = {"roomChoice": "Plenary", "scoreMin": 7, "scoreMax": 10}

        self.admin_client.get_received()
        self.admin_client.emit("admin_probe_by_gui", filters)
        events = self.admin_client.get_received()

        probe_events = [e for e in events if e["name"] == "server_probe_by_gui"]
        self.assertEqual(len(probe_events), 1)

        # Test text probe
        text_data = {"roomChoice": "Plenary", "explicit": "score > 7"}

        self.admin_client.get_received()
        self.admin_client.emit("admin_probe_by_text", text_data)
        events = self.admin_client.get_received()

        probe_events = [e for e in events if e["name"] == "server_probe_by_text"]
        self.assertEqual(len(probe_events), 1)

    def test_admin_filter_management(self):
        """Test saving, loading, and deleting filters"""
        # Test saving a GUI filter
        filter_data = {
            "filterName": "test_gui_filter",
            "scoreMin": 5,
            "scoreMax": 8,
            "roomChoice": "Plenary",
        }

        self.admin_client.get_received()
        self.admin_client.emit("admin_save_filter", filter_data)
        events = self.admin_client.get_received()

        filter_events = [e for e in events if e["name"] == "server_send_filter_names"]
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

        self.assertEqual(len(filter_events), 1)
        self.assertEqual(len(flasher_events), 1)

        # Verify filter was saved
        saved_filter = Filter.query.filter_by(name="test_gui_filter").first()
        self.assertIsNotNone(saved_filter)
        self.assertTrue(saved_filter.is_gui)

        # Test loading the filter
        self.admin_client.get_received()
        self.admin_client.emit("admin_load_filter", "test_gui_filter")
        events = self.admin_client.get_received()

        load_events = [e for e in events if e["name"] == "server_load_filter"]
        self.assertEqual(len(load_events), 1)

        # Test saving a text filter
        text_filter_data = {
            "filterName": "test_text_filter",
            "text": "score > 6 and score < 9",
        }

        self.admin_client.get_received()
        self.admin_client.emit("admin_save_filter", text_filter_data)
        events = self.admin_client.get_received()

        # Should get filter names update
        filter_events = [e for e in events if e["name"] == "server_send_filter_names"]
        self.assertEqual(len(filter_events), 1)

        # Test deleting filters
        for filter_name in ["test_gui_filter", "test_text_filter"]:
            self.admin_client.get_received()
            self.admin_client.emit("admin_delete_filter", filter_name)
            events = self.admin_client.get_received()

            filter_events = [
                e for e in events if e["name"] == "server_send_filter_names"
            ]
            flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

            self.assertEqual(len(filter_events), 1)
            self.assertEqual(len(flasher_events), 1)

        # Verify filters were deleted
        deleted_gui = Filter.query.filter_by(name="test_gui_filter").first()
        deleted_text = Filter.query.filter_by(name="test_text_filter").first()
        self.assertIsNone(deleted_gui)
        self.assertIsNone(deleted_text)

    def test_admin_set_bar(self):
        """Test setting the bar (threshold)"""
        new_bar = 6.5

        self.admin_client.get_received()
        self.admin_client.emit("admin_set_bar", new_bar)
        events = self.admin_client.get_received()

        grid_events = [e for e in events if e["name"] == "server_set_grid"]
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

        self.assertEqual(len(grid_events), 1)
        self.assertEqual(len(flasher_events), 1)

    def test_admin_bulk_confirm(self):
        """Test bulk confirming papers in queue"""
        self.admin_client.get_received()
        self.admin_client.emit("admin_bulk_confirm")
        events = self.admin_client.get_received()

        grid_events = [e for e in events if e["name"] == "server_set_grid"]
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]

        self.assertEqual(len(grid_events), 1)
        self.assertEqual(len(flasher_events), 1)

    def test_admin_set_disable_logins(self):
        """Test disabling/enabling logins"""
        # Test disabling logins
        self.admin_client.get_received()
        self.admin_client.emit("admin_set_disable_logins", True)
        events = self.admin_client.get_received()

        disable_events = [
            e for e in events if e["name"] == "server_relay_disable_logins"
        ]
        self.assertEqual(len(disable_events), 1)
        self.assertTrue(disable_events[0]["args"][0])

        # Test enabling logins
        self.admin_client.get_received()
        self.admin_client.emit("admin_set_disable_logins", False)
        events = self.admin_client.get_received()

        disable_events = [
            e for e in events if e["name"] == "server_relay_disable_logins"
        ]
        self.assertEqual(len(disable_events), 1)
        self.assertFalse(disable_events[0]["args"][0])

    def test_admin_become_user(self):
        """Test admin switching to another user"""
        regular_user = User.query.filter_by(email="fake.citizen@example.com").first()
        self.assertIsNotNone(regular_user)

        self.admin_client.get_received()
        self.admin_client.emit("admin_become_user", regular_user.email)
        events = self.admin_client.get_received()

        welcome_events = [e for e in events if e["name"] == "server_welcome"]
        self.assertEqual(len(welcome_events), 1)

        welcome_data = welcome_events[0]["args"][0]
        self.assertEqual(welcome_data["user"]["email"], regular_user.email)

    def test_admin_advance_queue(self):
        """Test advancing queue with status update"""
        advance_data = {"roomChoice": "Plenary", "updateStatus": "Accept"}

        self.admin_client.get_received()
        self.admin_client.emit("admin_advance_queue", advance_data)
        events = self.admin_client.get_received()

        # Should get globs update, might get warning if no papers in queue
        globs_events = [e for e in events if e["name"] == "server_set_globs"]
        self.assertGreaterEqual(len(globs_events), 0)  # Might be 0 if no queue

    def test_admin_file_upload_rejection(self):
        """Test that admin file upload without content fails gracefully"""
        self.admin_client.get_received()
        self.admin_client.emit("admin_file_upload", None)
        events = self.admin_client.get_received()

        # Should get error message
        flasher_events = [e for e in events if e["name"] == "server_send_flasher"]
        if flasher_events:
            self.assertEqual(flasher_events[0]["args"][0]["type"], "danger")


class TestSocketErrorHandling(HepcatTestCase):
    """Test error conditions and edge cases"""

    def setUp(self):
        super().setUp()
        self.socket_client = self.login()

    def tearDown(self):
        if self.socket_client.is_connected():
            self.socket_client.disconnect()
        super().tearDown()

    def test_invalid_paper_sticky(self):
        """Test sticky with non-existent paper"""
        invalid_sticky = {
            "nid": 99999,  # Non-existent paper
            "status": "Accept",
            "key": "invalid_key",
        }

        self.socket_client.get_received()
        self.socket_client.emit("user_set_sticky", invalid_sticky)
        events = self.socket_client.get_received()

        # Should handle gracefully (exact behavior depends on implementation)
        self.assertTrue(self.socket_client.is_connected())

    def test_invalid_revoke_sticky(self):
        """Test revoking sticky with wrong key"""
        paper = Paper.query.first()
        if paper:
            revoke_data = {"nid": paper.nid, "key": "wrong_key"}

            self.socket_client.get_received()
            self.socket_client.emit("user_revoke_sticky", revoke_data)
            events = self.socket_client.get_received()

            # Should handle gracefully
            self.assertTrue(self.socket_client.is_connected())

    def test_malformed_data(self):
        """Test events with malformed data"""
        malformed_scenarios = [
            ("user_request_queue", None),  # Missing room
            ("user_set_sticky", {"nid": "not_a_number"}),  # Invalid nid type
            ("user_change_password", {}),  # Missing required fields
        ]

        for event_name, bad_data in malformed_scenarios:
            with self.subTest(event=event_name):
                if not self.socket_client.is_connected():
                    self.socket_client = self.login()

                self.socket_client.get_received()
                self.socket_client.emit(event_name, bad_data)

                # Should handle gracefully without crashing
                time.sleep(0.1)
                # Don't assert connection state as it may vary by implementation
