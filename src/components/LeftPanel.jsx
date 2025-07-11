// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import Queue from './Queue';

export default function LeftPanel() {
  const { isAdmin, allRooms, roomChoice, setRoomChoice, userBelongsInRoom } =
    useUser();
  const { queue, roomGlobs } = useQueue();
  const { fontPref } = usePreferences();
  const hideQueue = !isAdmin && roomGlobs?.hide_queue;
  const hideMessage = roomGlobs?.message
    ? roomGlobs.message
    : 'The queue is hidden.';
  const message = hideQueue ? hideMessage : 'No papers in queue.';

  const userRooms = allRooms.filter(
    // XXX Later make this configurable whether everyone can
    // go in any room.
    (room) => isAdmin || userBelongsInRoom(room)
  );

  return (
    <Container fluid className="LeftPanel">
      <div className={fontPref}>
        <Stack direction="horizontal" gap={4} className="room-choice-menu">
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
  );
}
