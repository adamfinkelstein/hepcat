// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import PaperInfo from './PaperInfo';
import PaperConflicts from './PaperConflicts';

export default function Paper() {
  const { isOutsideRole } = useUser();
  const { queue, queueCurrent, roomGlobs } = useQueue();
  const isPaper =
    queue && queue.length && queueCurrent < queue.length && queueCurrent >= 0;
  const currentShow = isPaper && roomGlobs.current_show;
  const cp = isPaper ? queue[queueCurrent] : null; // current paper
  const isConflict = cp ? cp.nid === 0 : false;
  const hidePaperOutside = isOutsideRole() && currentShow;
  const hideThisPaper = hidePaperOutside || !isPaper || isConflict;
  const hideMessage = isConflict
    ? 'CONFLICT'
    : !isPaper
      ? 'No current paper.'
      : 'In session.';

  return (
    <Container fluid className="Paper">
      <div>
        {hideThisPaper ? (
          <p className="paper-message">{hideMessage}</p>
        ) : !currentShow ? (
          <PaperConflicts />
        ) : (
          <PaperInfo />
        )}
      </div>
    </Container>
  );
}
