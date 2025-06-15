// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { usePreferences } from '../contexts/PreferencesContext';
import DisableLogins from '../components/DisableLogins';

export default function UsersPage() {
  const { flash } = useFlasher();
  const { socketEmit } = useSocketIO();
  const { user } = useUser();
  const { allUsers } = useAdmin();
  const { controlledLog } = useControlledLog();
  const { revealConfirmationBox } = useConfirmationBox();
  const { fontPref } = usePreferences();

  const usersArr = Object.entries(allUsers).map(([_email, oneUser]) => oneUser);
  usersArr.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const userToClass = (oneUser) => {
    const highlight = oneUser.role_is_admin || oneUser.role_name === 'Backup';
    return highlight ? 'admin-user' : '';
  };

  const switchUserFunc = (oneUser) => {
    const name = oneUser.full_name;
    return () => {
      let text =
        'Are you really sure you want to switch to become ' + name + '?';
      revealConfirmationBox('Please Confirm', text, (confirmed) => {
        if (confirmed) {
          const msg = 'Becoming user ' + name;
          controlledLog(msg);
          flash(msg, 'success');
          socketEmit('admin_become_user', oneUser.email);
        } else {
          const msg = 'Canceled switching user.';
          controlledLog(msg);
          // flash(msg, 'warning'); // bad UX to flash on cancel
        }
      });
    };
  };

  return (
    <Container className="UsersPage">
      <div className={fontPref}>
        <Container fluid className="mt-3">
          <Stack direction="horizontal" gap={5}>
            <h1>All Users</h1>
            <DisableLogins />
          </Stack>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Switch</th>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Rooms</th>
                <th>Online?</th>
              </tr>
            </thead>
            <tbody>
              {usersArr.map((oneUser) => {
                return (
                  <tr key={oneUser.email}>
                    <td>
                      {oneUser.email !== user.email && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={switchUserFunc(oneUser)}
                        >
                          Become
                        </Button>
                      )}
                    </td>
                    <td>
                      <span className={userToClass(oneUser)}>
                        {oneUser.full_name}
                      </span>
                    </td>
                    <td>{oneUser.role_name}</td>
                    <td>{oneUser.email}</td>
                    <td>{oneUser.rooms?.replace(/Room_/g, '')}</td>
                    <td>
                      {oneUser.is_online && (
                        <Badge bg="success">{oneUser.room_name}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Container>
        <p>&nbsp;</p>
      </div>
    </Container>
  );
}
