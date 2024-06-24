import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Badge from 'react-bootstrap/Badge';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Button from 'react-bootstrap/Button';

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
  const { socketEmit } = useSocketIO();
  const { allUsers, conflictbot } = useUser();
  const { controlledLog } = useControlledLog();
  const usersArr = Object.entries(allUsers).map(([_email, user]) => user);
  usersArr.sort((a, b) => a.full_name.localeCompare(b.full_name));

  const userLine = (user) => {
    const { full_name, email, rooms, room_name } = user;
    let line = full_name + ' <' + email + '>';
    if (conflictbot) {
      line += ' Now called to: ' + room_name;
    }
    if (rooms) line += ' — [' + rooms + ']';
    return line;
  };

  const userClasses = (user) => {
    return user.role_is_admin ? 'admin-user' : '';
  };

  const switchUserFunc = (user) => {
    const name = user.full_name;
    return () => {
      let text =
        'Are you really sure you want to switch to become user ' + name + '?';
      if (window.confirm(text) === true) {
        controlledLog('Switch user confirmed. Emit message.');
        socketEmit('admin_become_user', user.email);
      } else {
        controlledLog('Switch user canceled.');
      }
    };
  };

  return (
    <Container className="UsersPage">
      <Container className="users-main-container">
        <p>&nbsp;</p>
        <Stack direction="horizontal">
          <span className="font-size-1">All Users&nbsp;&nbsp;</span>
        </Stack>
        <Stack direction="vertical">
          {usersArr.map((user) => {
            return (
              <div key={user.email}>
                <Button
                  className="switch-button"
                  variant="secondary"
                  onClick={switchUserFunc(user)}
                >
                  Become
                </Button>
                <span className={userClasses(user)}>{userLine(user)}</span>
                {user.is_online && (
                  <>
                    &nbsp;
                    <Badge bg="success">Online</Badge>
                  </>
                )}
              </div>
            );
          })}
          <p>&nbsp;</p>
        </Stack>
      </Container>
    </Container>
  );
}
