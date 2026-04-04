// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import BoxMsg from './BoxMsg';
import PaperInfo from './PaperInfo';
import PaperConflicts from './PaperConflicts';

export default function PaperTab() {
  const { isAdmin, isOutsideRole } = useUser();
  const { queue, queueCurrent, isCurrentPaper, roomGlobs } = useQueue();
  const hideQueue = !isAdmin && roomGlobs?.hide_queue;
  const currentShow = isCurrentPaper && roomGlobs.current_show;
  const cp = isCurrentPaper ? queue[queueCurrent] : null; // current paper
  const isConflict = cp ? cp.nid === 0 : false;
  const isOutside = isOutsideRole();
  let msg = false;
  if (hideQueue) {
    msg = 'Queue is hidden.';
  } else if (!isCurrentPaper) {
    msg = 'No current paper.';
  } else if (isConflict) {
    msg = 'CONFLICT';
  } else if (isOutside && currentShow) {
    msg = 'In session.';
  }

  return (
    <Container fluid className="PaperTab">
      {msg ? (
        <BoxMsg msg={msg} />
      ) : currentShow ? (
        <PaperInfo />
      ) : (
        <PaperConflicts />
      )}
    </Container>
  );
}
