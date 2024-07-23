import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Badge from 'react-bootstrap/Badge';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';

/*
import moment from 'moment';
function timeDiff(since) {
  const localTime = Boolean(process.env.REACT_APP_USER_LOCAL_TIME);
  const then = localTime ? moment(since) : moment.utc(since);
  const diff = then.fromNow();
  return diff;
}
*/

export default function UsersPage() {
  const { flash } = useFlasher();
  const { socketEmit } = useSocketIO();
  const { user, allUsers } = useUser();
  const { controlledLog } = useControlledLog();
  const { revealConfirmationBox } = useConfirmationBox();

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
          flash(msg, 'warning');
        }
      });
    };
  };

  return (
    <Container className="UsersPage">
      <Container className="users-main-container">
        <p>&nbsp;</p>
        <Stack direction="horizontal">
          <span className="font-size-1">All Users&nbsp;&nbsp;</span>
        </Stack>
        <Table striped bordered hover className="stats-table">
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
                    {oneUser.is_online && <Badge bg="success">Online</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Container>
    </Container>
  );
}
