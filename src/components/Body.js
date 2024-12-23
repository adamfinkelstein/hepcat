import Container from 'react-bootstrap/Container';
import Split from 'react-split';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useAppGlobals } from '../contexts/AppContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import {
  useSplitWidth,
  useChangeSplitWidth,
  useFontInfo,
} from '../contexts/PreferencesContext';
import Queue from './Queue';
import Paper from './Paper';
import GridTab from './GridTab';
import SetQueue from './SetQueue';

export default function Body() {
  const { socketEmit } = useSocketIO();
  const {
    user,
    isAdmin,
    allRooms,
    conflictbot,
    roomCalledTo,
    roomChoice,
    setRoomChoice,
  } = useUser();
  const { queue, serverGlobs } = useAppGlobals();
  const splitWidth = useSplitWidth();
  const changeSplitWidth = useChangeSplitWidth();
  const { currentFontStyle } = useFontInfo();
  const showRoomWarning =
    !isAdmin && conflictbot && roomCalledTo !== roomChoice;
  const isScreenRole = user?.role_name === 'Screen';
  const isOutsideRole = user?.role_name === 'Outside';
  const isScreen = isScreenRole || isOutsideRole;
  const showGrid = !isScreen;
  const hideQueue = !isAdmin && serverGlobs?.hide_queue;
  const hideMessage =
    serverGlobs && serverGlobs.message
      ? serverGlobs.message
      : 'The queue is hidden.';
  const message = hideQueue ? hideMessage : 'No papers in queue.';
  const isPlenary = roomChoice === 'Plenary';
  const showBringButton = isAdmin && conflictbot && !isPlenary;
  const calledUsers = serverGlobs && serverGlobs.called_users;
  const bringButtonLabel = calledUsers
    ? 'Release to Plenary'
    : 'Bring Reviewers';

  const userBelongsInRoom = (room) =>
    room === 'Plenary' || user?.rooms?.includes(room);

  const userRooms = allRooms.filter(
    (room) => isAdmin || conflictbot || userBelongsInRoom(room),
  );

  const handleDragEnd = (sizes) => changeSplitWidth(sizes);

  const handleBringButton = () => {
    if (!conflictbot) return;
    const data = { bring: !calledUsers, room: roomChoice };
    socketEmit('admin_bring_to_room', data);
  };

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
          onDragEnd={handleDragEnd}
        >
          <Container fluid className="left-panel">
            <div className={currentFontStyle}>
              <Stack
                direction="horizontal"
                gap={4}
                className="room-choice-menu"
              >
                <DropdownButton title={roomChoice} variant="secondary">
                  {userRooms.map((room, index) => {
                    return (
                      <Dropdown.Item
                        key={index}
                        as="button"
                        onClick={() => setRoomChoice(room)}
                      >
                        {room}
                      </Dropdown.Item>
                    );
                  })}
                </DropdownButton>
                {showBringButton && (
                  <Button variant="primary" onClick={handleBringButton}>
                    {bringButtonLabel}
                  </Button>
                )}
                {showRoomWarning && (
                  <span id="room-warning">
                    You were last called to {roomCalledTo}.
                  </span>
                )}
              </Stack>
              {queue.length && !hideQueue ? (
                <Queue />
              ) : (
                <div className="queue-message">{message}</div>
              )}
            </div>
          </Container>
          <Container fluid className="right-panel">
            <div className={currentFontStyle}>
              <Tabs
                defaultActiveKey="paper"
                id="paper-tabs"
                className="mb-3 bigger-font tabs"
              >
                {!hideQueue && (
                  <Tab eventKey="paper" title="Paper" className="tab">
                    <Paper />
                  </Tab>
                )}
                {showGrid && (
                  <Tab eventKey="grid" title="Grid" className="tab">
                    <GridTab />
                  </Tab>
                )}
                {isAdmin && (
                  <Tab eventKey="queue" title="Set Queue" className="tab">
                    <SetQueue />
                  </Tab>
                )}
              </Tabs>
            </div>
          </Container>
        </Split>
      )}
    </Container>
  );
}
