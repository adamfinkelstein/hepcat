// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import PaperInfo from './PaperInfo';
import PaperConflicts from './PaperConflicts';

export default function PaperTab() {
  const { isOutsideRole } = useUser();
  const { queue, queueCurrent, isCurrentPaper, roomGlobs } = useQueue();
  const currentShow = isCurrentPaper && roomGlobs.current_show;
  const cp = isCurrentPaper ? queue[queueCurrent] : null; // current paper
  const isConflict = cp ? cp.nid === 0 : false;
  const hidePaperOutside = isOutsideRole() && currentShow;
  const hideThisPaper = hidePaperOutside || !isCurrentPaper || isConflict;
  const hideMessage = isConflict
    ? 'CONFLICT'
    : !isCurrentPaper
      ? 'No current paper.'
      : 'In session.';

  return (
    <Container fluid className="PaperTab">
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
