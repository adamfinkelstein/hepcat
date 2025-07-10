// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import AvailableChair from './AvailableChair';
import NameList from './NameList';

export default function PaperConflicts() {
  const { isAdmin, roomChoice, belongsInRoom } = useUser();
  const { queue, queueCurrent, isCurrentPaper, roomGlobs } = useQueue();
  const currentShowEnter = isCurrentPaper ? roomGlobs.current_show_enter : 0;
  const isNextPaper = queueCurrent < queue.length - 1;
  const cp = isCurrentPaper ? queue[queueCurrent] : null; // current paper
  const np = isNextPaper ? queue[queueCurrent + 1] : null; // next paper
  const currentConflicts = cp?.conflicts ? cp?.conflicts : [];

  // sort through conflicts.
  // reorder depending on whether they belong in this room or not.
  function siftConflicts(conflicts) {
    const inRoom = [];
    const outRoom = [];
    for (let i = 0; i < conflicts.length; i++) {
      let ci = { ...conflicts[i] }; // copy for setting otherRoom
      if (belongsInRoom(ci, roomChoice)) {
        inRoom.push(ci);
      } else {
        ci.otherRoom = true;
        outRoom.push(ci);
      }
    }
    const result = inRoom.concat(outRoom);
    return result;
  }

  // currentShowEnter is 0, 1, or -1 for advance in queue.
  // Comes from database entry in GQ.
  // Ugly. Should probably be a pair of booleans.
  let current_enter = [];
  let current_leave = [];
  if (cp && currentShowEnter === 1) {
    // advance button
    current_enter = cp.enter;
    current_leave = cp.leave;
  } else if (np && currentShowEnter === -1) {
    // prev button, so swap enter/leave from next paper (np)
    current_enter = np.leave;
    current_leave = np.enter;
  }
  const conflicts_arrays = [
    {
      show: true,
      title: 'Conflicts:',
      array: siftConflicts(currentConflicts),
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
      {isAdmin && <AvailableChair conflicts={currentConflicts} />}
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
