from tests.hepcat_test_case import HepcatTestCase


class TestSockets(HepcatTestCase):
    def setUp(self):
        super().setUp()
        self.socket_client = self.login()

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
