# Copyright (c) 2025 Adam Finkelstein
# Licensed under the Apache 2.0 License. See LICENSE file for details.

from tests.hepcat_test_case import HepcatTestCase
from app.util import read_text_from_file

"""
This class tests the complete list of socket events
as implemented in apps/sockets/routes.py
(but not the on_error handler) -- listed here:

* connect
* disconnect
* user_request_grid
* user_request_queue
* user_set_sticky
* user_revoke_sticky
* user_change_password
* admin_become_user
* admin_prev_paper
* admin_next_paper
* admin_advance_queue
* admin_show_current
* admin_hide_queue
* admin_set_queue_by_gui
* admin_set_queue_by_text
* admin_save_filter
* admin_load_filter
* admin_delete_filter
* admin_probe_by_gui
* admin_probe_by_text
* admin_set_bar
* admin_set_disable_logins
* admin_bulk_confirm
* admin_file_upload
* admin_request_download
* admin_wipe_database
* admin_load_database

Some limitations that could be addressed in future updates:
- Most calls cover legal paths and skip failure modes.
- Thus much of the error-handling code is not exercised.
- Generally, return values are not checked,
  - except for message "names". Contents are ignored.
- Also, state of app is not checked.
  - For example, changing bar does not check bar.
"""


class TestSockets(HepcatTestCase):

    ##########
    #
    # Helper functions called by multiple tests below.
    # Mainly login a new client of a particular type and
    # check the connection is ok.
    #
    ##########

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
        assert len(events) == 3
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.admin@example.com"
        assert events[1]["name"] == "server_send_admin_data"
        assert events[2]["name"] == "server_refresh_all_users"
        return client

    def queue_fill_by_text(self, client):
        text_query = "AND( Grid:Ready, Check:Below_Bar )"
        data = {"roomChoice": "Plenary", "explicit": text_query, "noTSP": True}
        client.emit("admin_set_queue_by_text", data)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_queue"
        assert events[1]["name"] == "server_send_flasher"

    def queue_next_paper(self, client):
        client.emit("admin_next_paper", "Plenary")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_queue"

    ##########
    #
    # Testing regular user actions
    #
    ##########

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

    def test_user_request_queue(self):
        client = self.get_regular_client()
        client.emit("user_request_queue", "Plenary")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_queue"
        client.disconnect()

    def test_user_set_and_revoke_sticky(self):
        client = self.get_regular_client()
        # set sticky
        sticky = {"nid": 110, "status": "Accept", "key": "test_key"}
        client.emit("user_set_sticky", sticky)
        events = client.get_received()
        assert len(events) == 3
        assert events[0]["name"] == "server_confirm_sticky"
        assert events[1]["name"] == "server_set_sticky"
        assert events[2]["name"] == "server_send_flasher"

        # now revoke sticky, using same nid and key
        client.emit("user_revoke_sticky", sticky)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_sticky"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_user_change_password(self):
        client = self.get_regular_client()
        data = {"oldPassword": "pass", "password": "new_pass", "forEmail": ""}
        client.emit("user_change_password", data)
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_send_flasher"
        client.disconnect()
        # Now try to log in with the new password
        client = self.login(email="fake.citizen@example.com", password="new_pass")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.citizen@example.com"
        client.disconnect()

    ##########
    #
    # Testing admin actions
    #
    ##########

    def test_invalid_admin_access(self):
        client = self.get_regular_client()
        client.emit("admin_next_paper", "Plenary")
        # regular user should get logged out on admin action
        assert not client.is_connected()

    def test_admin_become_user(self):
        client = self.get_admin_client()
        client.emit("admin_become_user", "fake.citizen@example.com")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_welcome"
        assert events[0]["args"][0]["user"]["email"] == "fake.citizen@example.com"
        client.disconnect()

    def test_admin_next_paper(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        self.queue_next_paper(client)
        client.disconnect()

    def test_admin_prev_paper(self):
        client = self.get_admin_client()
        # fill queue and move ahead one in the queue
        self.queue_fill_by_text(client)
        self.queue_next_paper(client)
        # now that there is a prev, go to the prev
        client.emit("admin_prev_paper", "Plenary")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_queue"
        client.disconnect()

    def test_admin_advance_queue(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        data = {"roomChoice": "Plenary", "updateStatus": "Reject"}
        client.emit("admin_advance_queue", data)
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_queue"
        client.disconnect()

    def test_admin_show_current(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        client.emit("admin_show_current", "Plenary")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_set_queue"
        client.disconnect()

    def test_admin_hide_queue(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        data = {"roomChoice": "Plenary", "hide": True, "message": "test_msg"}
        client.emit("admin_hide_queue", data)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_queue"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_set_queue_by_gui(self):
        client = self.get_admin_client()
        data = {"roomChoice": "Plenary", "foo": "bar"}
        client.emit("admin_set_queue_by_gui", data)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_queue"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_set_queue_by_text(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        client.disconnect()

    def test_admin_save_load_delete_filter(self):
        client = self.get_admin_client()
        # first save
        data = {"filterName": "test_filter", "text": "test_text"}
        client.emit("admin_save_filter", data)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_send_admin_data"
        assert events[1]["name"] == "server_send_flasher"
        # next load
        client.emit("admin_load_filter", "test_filter")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_load_filter"
        # finally delete
        client.emit("admin_delete_filter", "test_filter")
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_send_admin_data"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_probe_by_gui(self):
        client = self.get_admin_client()
        data = {"roomChoice": "Plenary", "foo": "bar"}
        client.emit("admin_probe_by_gui", data)
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_probe_by_gui"
        client.disconnect()

    def test_admin_probe_by_text(self):
        client = self.get_admin_client()
        text_query = "AND( Grid:Ready, Check:Below_Bar )"
        data = {"roomChoice": "Plenary", "explicit": text_query, "noTSP": True}
        client.emit("admin_probe_by_text", data)
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_probe_by_text"
        client.disconnect()

    def test_admin_set_bar(self):
        client = self.get_admin_client()
        client.emit("admin_set_bar", 0.0)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_grid"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_set_disable_logins(self):
        client = self.get_admin_client()
        client.emit("admin_set_disable_logins", True)
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_send_admin_data"
        client.disconnect()

    def test_admin_bulk_confirm(self):
        client = self.get_admin_client()
        self.queue_fill_by_text(client)
        client.emit("admin_bulk_confirm")
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_set_grid"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_file_upload(self):
        filename = "tests/test-data/clusters.csv"
        contents = read_text_from_file(filename)
        bytes = contents.encode()
        client = self.get_admin_client()
        client.emit("admin_file_upload", bytes)
        events = client.get_received()
        assert len(events) == 2
        assert events[0]["name"] == "server_send_admin_data"
        assert events[1]["name"] == "server_send_flasher"
        client.disconnect()

    def test_admin_request_download(self):
        client = self.get_admin_client()
        client.emit("admin_request_download", "filters")
        events = client.get_received()
        assert len(events) == 1
        assert events[0]["name"] == "server_send_download"
        client.disconnect()

    def test_admin_wipe_database(self):
        client = self.get_admin_client()
        client.emit("admin_wipe_database")
        # any user should get logged out on this admin action
        assert not client.is_connected()

    def test_admin_load_database(self):
        client = self.get_admin_client()
        client.emit("admin_load_database")
        # any user should get logged out on this admin action
        assert not client.is_connected()
