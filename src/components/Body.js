import Container from 'react-bootstrap/Container';
import Split from 'react-split';
import { useAppGlobals } from '../contexts/AppContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Queue from './Queue';
import Paper from './Paper';
import GridSection from './GridSection';
import SetQueue from './SetQueue';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import {
  useSplitWidth,
  useChangeSplitWidth,
} from '../contexts/PreferencesContext';

export default function Body() {
  const { socketEmit } = useSocketIO();
  const { user, isAdmin, roomCalledTo, roomChoice, setRoomChoice } = useUser();
  const globals = useAppGlobals();
  const showRoomWarning = !isAdmin && roomCalledTo !== roomChoice;
  const isScreen = user && user.role_name === 'Screen';
  const queue = globals.queue;

  //const isPaper = queue && queue.length && globals.queueCurrent < queue.length
  const hideQueue =
    !isAdmin && globals.serverGlobs && globals.serverGlobs.hide_queue;
  const hideMessage =
    globals.serverGlobs && globals.serverGlobs.message
      ? globals.serverGlobs.message
      : 'The queue is hidden.';
  const message = hideQueue ? hideMessage : 'No papers in queue.';

  const splitWidth = useSplitWidth();
  const changeSplitWidth = useChangeSplitWidth();

  const enableBringButton =
    isAdmin && globals.serverGlobs && !globals.serverGlobs.called_users;
  const bringVerb = enableBringButton ? 'Bring ' : 'Brought ';
  const bringButtonLabel =
    bringVerb +
    (roomChoice === 'Plenary'
      ? 'Everyone to Plenary'
      : roomChoice + ' Reviewers');

  return (
    <Container fluid className="Body">
      {!user ? (
        <p id="waiting-for-server">Waiting for server connection...</p>
      ) : (
        <Split
          direction="horizontal"
          className="split"
          sizes={[splitWidth[0], splitWidth[1]]}
          cursor="col-resize"
          minSize={[500, 550]}
          onDragEnd={(sizes) => changeSplitWidth(sizes)}
        >
          <Container className="left-panel">
            <Stack direction="horizontal" gap={4} className="RoomButtonStack">
              <DropdownButton
                title={roomChoice}
                variant="secondary"
                className="a_grid-display-dropdown"
              >
                {['Plenary', 'Room_1A', 'Room_1B', 'Room_2A', 'Room_2B'].map(
                  (room, index) => {
                    return (
                      <Dropdown.Item
                        key={index}
                        as="button"
                        onClick={() => setRoomChoice(room)}
                      >
                        {room}
                      </Dropdown.Item>
                    );
                  },
                )}
              </DropdownButton>
              {isAdmin &&
                (enableBringButton ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      socketEmit('admin_bring_to_room', roomChoice);
                    }}
                  >
                    {bringButtonLabel}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    {bringButtonLabel}
                  </Button>
                ))}
              {showRoomWarning && (
                <span id="room-warning">
                  You were last called to {roomCalledTo}.
                </span>
              )}
            </Stack>
            {queue.length && !hideQueue ? (
              <Queue />
            ) : (
              <div id="noPapersInQueue">{message}</div>
            )}
          </Container>
          <Container className="right-panel">
            <Tabs
              defaultActiveKey="paper"
              id="paper-tabs"
              className="mb-3 font-size-3 tabs"
            >
              {!hideQueue && (
                <Tab eventKey="paper" title="Paper" className="tab">
                  <Paper />
                </Tab>
              )}
              {!isScreen && (
                <Tab eventKey="grid" title="Grid" className="tab">
                  <GridSection />
                </Tab>
              )}
              {isAdmin && (
                <Tab eventKey="admin" title="Admin Controls" className="tab">
                  <SetQueue />
                </Tab>
              )}
            </Tabs>
          </Container>
        </Split>
      )}
    </Container>
  );
}
