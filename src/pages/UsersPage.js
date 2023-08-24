import moment from 'moment';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
// import {useState} from 'react'
// import {useFlasher} from '../contexts/FlasherContext'
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Button from 'react-bootstrap/Button';

function timeDiff(since) {
  const localTime = Boolean(process.env.REACT_APP_USER_LOCAL_TIME);
  const then = localTime ? moment(since) : moment.utc(since);
  const diff = then.fromNow();
  return diff;
}

export default function UsersPage() {
  // let [lastPing, setLastPing] = useState(null)
  // let flasher = useFlasher()
  // let flash = flasher["flash"]

  const { socketEmit } = useSocketIO();
  const { allUsers } = useUser();
  const noSuper = allUsers.filter((user) => user.role_name !== 'Super');
  const { controlledLog } = useControlledLog();
  const pingEnv = process.env.REACT_APP_PING_TIMER_SECS;
  const pingSec = pingEnv ? parseInt(pingEnv) : 0;

  const userLine = (user) => {
    const { full_name, email, rooms, room_name, last_seen, last_seen_in } =
      user;
    let line = full_name + ' <' + email + '> called to: ' + room_name;
    if (rooms) line += ' assigned: [' + rooms + ']';
    if (pingSec && last_seen) {
      line += ' (seen ' + timeDiff(last_seen);
      if (last_seen_in) line += ' in ' + last_seen_in;
      line += ')';
    }
    return line;
  };

  const userClasses = (user) => {
    return user.role_is_admin ? 'admin-user' : '';
  };

  const handleRefreshClick = () => {
    socketEmit('user_request_refresh');
    controlledLog('user_request_refresh');
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
          <Button
            className="refresh-users-button"
            variant="primary"
            onClick={() => handleRefreshClick()}
          >
            Refresh Data
          </Button>
        </Stack>
        <Stack direction="vertical">
          {noSuper.map((user) => {
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
              </div>
            );
          })}
          <p>&nbsp;</p>
        </Stack>
      </Container>
    </Container>
  );
}
