// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import NameList from './NameList';

export default function PaperConflicts() {
  const { roomChoice } = useUser();
  const { queue, queueCurrent, isCurrentPaper, roomGlobs } = useQueue();
  const currentShowEnter = isCurrentPaper ? roomGlobs.current_show_enter : 0;
  const cp = isCurrentPaper ? queue[queueCurrent] : null; // current paper

  function userBelongsInRoom(user, room) {
    const rooms = user.rooms;
    if (!rooms || !rooms.length) return false;
    return rooms.includes(room);
  }

  // sort through conflicts.
  // reorder depending on whether they belong in this room or not.
  function siftConflicts(conflicts) {
    if (!roomChoice || !roomChoice.length || roomChoice === 'Plenary') {
      return conflicts; // no changes
    }
    const inRoom = [];
    const outRoom = [];
    for (let i = 0; i < conflicts.length; i++) {
      let ci = conflicts[i];
      if (userBelongsInRoom(ci, roomChoice)) {
        inRoom.push(ci);
      } else {
        ci.otherRoom = true;
        outRoom.push(ci);
      }
    }
    const result = inRoom.concat(outRoom);
    return result;
  }

  // XXX Ugly code: currentShowEnter is 0, 1, or -1.
  // Comes from database entry in GQ.
  // Should probably be a pair of booleans.
  let current_enter = isCurrentPaper && currentShowEnter === 1 ? cp.enter : [];
  let current_leave = isCurrentPaper && currentShowEnter === 1 ? cp.leave : [];
  if (isCurrentPaper && currentShowEnter === -1) {
    current_enter = [];
    current_leave = [];
    if (queueCurrent < queue.length - 1) {
      let np = queue[queueCurrent + 1]; // next paper
      current_enter = np.leave; // note backward because of prev button
      current_leave = np.enter;
    }
  }
  const conflicts_arrays = [
    {
      show: true,
      title: 'Conflicts:',
      array:
        isCurrentPaper && cp && cp.conflicts ? siftConflicts(cp.conflicts) : [],
      default: '(none)',
    },
    {
      show: current_leave?.length,
      title: 'Leave:',
      array: siftConflicts(current_leave),
      default: '',
    },
    {
      show: current_enter?.length,
      title: 'Return:',
      array: siftConflicts(current_enter),
      default: '',
    },
  ];

  return (
    <div>
      {conflicts_arrays.map((conf_arr, conf_ind) =>
        conf_arr.show ? (
          <NameList key={conf_ind} conf_arr={conf_arr} />
        ) : (
          <p key={conf_ind}>{conf_arr.default}</p>
        )
      )}
    </div>
  );
}
