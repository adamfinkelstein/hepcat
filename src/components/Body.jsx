// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Split from 'react-split';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import Queue from './Queue';
import Paper from './Paper';
import GridTab from './GridTab';
import SetQueue from './SetQueue';

export default function Body() {
  const {
    user,
    isAdmin,
    allRooms,
    roomChoice,
    setRoomChoice,
    isScreenOrOutside,
  } = useUser();
  const { queue, roomGlobs } = useQueue();
  const { splitWidth, setSplitWidth, fontPref } = usePreferences();
  const showGrid = !isScreenOrOutside();
  const hideQueue = !isAdmin && roomGlobs?.hide_queue;
  const hideMessage = roomGlobs?.message
    ? roomGlobs.message
    : 'The queue is hidden.';
  const message = hideQueue ? hideMessage : 'No papers in queue.';

  const userBelongsInRoom = (room) =>
    room === 'Plenary' || user?.rooms?.includes(room);

  const userRooms = allRooms.filter(
    // XXX Later make this configurable whether everyone can
    // go in any room.
    (room) => isAdmin || userBelongsInRoom(room)
  );

  const handleDragEnd = (sizes) => setSplitWidth(sizes);

  return (
    <Container fluid className="Body">
      {!user ? (
        <p>Waiting for server connection...</p>
      ) : (
        <Split
          direction="horizontal"
          className="split"
          sizes={[splitWidth[0], splitWidth[1]]}
          cursor="col-resize"
          minSize={[300, 500]}
          onDragEnd={handleDragEnd}
        >
          <Container fluid className="left-panel">
            <div className={fontPref}>
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
              </Stack>
              {queue.length && !hideQueue ? (
                <Queue />
              ) : (
                <div className="queue-message">{message}</div>
              )}
            </div>
          </Container>
          <Container fluid className="right-panel">
            <div className={fontPref}>
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
