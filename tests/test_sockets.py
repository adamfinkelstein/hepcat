from tests.hepcat_test_case import HepcatTestCase


class TestSockets(HepcatTestCase):
    def get_regular_client(self):
        client = self.login_regular()
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.citizen@example.com"
        return client

    def get_admin_client(self):
        client = self.login_admin()
        events = client.get_received()
        assert len(events) == 5
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.admin@example.com"
        assert events[1]["name"] == "server_relay_disable_logins"
        return client

    def test_login_regular(self):
        client = self.get_regular_client()
        client.disconnect()

    def test_login_admin(self):
        client = self.get_admin_client()
        client.disconnect()

    def test_user_request_grid(self):
        client = self.get_regular_client()
        client.emit("user_request_grid")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_grid"
        client.disconnect()

    def test_valid_admin_access(self):
        client = self.get_admin_client()
        client.emit("admin_next_paper")
        assert client.is_connected()
        client.disconnect()

    def test_invalid_admin_access(self):
        client = self.get_regular_client()
        client.emit("admin_next_paper")
        assert not client.is_connected()
