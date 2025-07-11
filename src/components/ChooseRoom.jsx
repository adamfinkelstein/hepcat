// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Stack from 'react-bootstrap/Stack';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useUser } from '../contexts/UserContext';

export default function ChooseRoom() {
  const { isAdmin, allRooms, roomChoice, setRoomChoice, userBelongsInRoom } =
    useUser();

  const userRooms = allRooms.filter(
    // XXX Later make this configurable whether everyone can
    // go in any room.
    (room) => isAdmin || userBelongsInRoom(room)
  );

  return (
    <Stack direction="horizontal" gap={4} className="ChooseRoom">
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
  );
}
