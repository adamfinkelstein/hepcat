import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import { useState } from 'react';
import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import QueueElement from './QueueElement.js';
import AdminQueueControls from './AdminQueueControls';

export default function Queue() {
  const { user, isAdmin } = useUser();
  const globals = useAppGlobals();
  const queue = globals.queue;
  const current = globals.queueCurrent;
  const counter = current + 1;
  const currentCount =
    counter > queue.length ? 'completed' : 'Q' + counter + ' of';
  const isScreenRole = user?.role_name === 'Screen';
  const isOutsideRole = user?.role_name === 'Outside';
  const isScreen = isScreenRole || isOutsideRole;
  const past_max = isScreen ? 0 : 3;
  const future_max = 12;
  const start_index = Math.max(0, current - past_max);
  const end_index = Math.min(counter + future_max, queue.length);
  const queueSlice = queue.slice(start_index, end_index);
  const hideQueue = globals.serverGlobs && globals.serverGlobs.hide_queue;
  const hiddenMsg = globals.serverGlobs ? globals.serverGlobs.message : '';

  const [showConflictsInQ, setShowConflictsInQ] = useState(true);
  const [showStarsInQ, setShowStarsInQ] = useState(true);

  function getQEntryClass(index, paper) {
    const isConflict = paper.nid === 0;

    let className = 'q-entry';
    if (index === globals.queueCurrent) {
      className += ' Current';
    } else if (index < globals.queueCurrent) {
      className += ' past-entry';
      if (!isScreen && !isConflict) {
        className += ' ' + paper.status;
      }
    } else if (index % 2) {
      // future - odd?
      className += ' odd-entry';
    }
    if (index === end_index - 1) {
      className += ' last-entry';
    }
    return className;
  }

  return (
    <Container fluid className="Queue">
      {user && isAdmin && <AdminQueueControls />}
      <Container fluid>
        {hideQueue && (
          <div className="bigger-font queue-hidden-for-non">
            Queue hidden for non-admin users, saying: <br /> {hiddenMsg}
          </div>
        )}
        <Stack direction="horizontal" className="mt-2">
          <span>
            Current: {currentCount} {queue.length}
          </span>
          <Stack direction="horizontal" className="q-show-checks" gap={3}>
            <div>Show:</div>
            <Form.Check
              label="Conflicts"
              type="checkbox"
              checked={showConflictsInQ}
              onChange={() => {
                setShowConflictsInQ(!showConflictsInQ);
              }}
            />
            <Form.Check
              label="Stars"
              type="checkbox"
              checked={showStarsInQ}
              onChange={() => {
                setShowStarsInQ(!showStarsInQ);
              }}
            />
          </Stack>
        </Stack>
      </Container>
      <Container fluid className="mt-2 q-list-container">
        <ul>
          {queueSlice.map((paper, index) => {
            return (
              <li
                key={index}
                className={getQEntryClass(index + start_index, paper)}
              >
                <QueueElement
                  paper={paper}
                  showConflicts={showConflictsInQ}
                  showStars={showStarsInQ}
                />
              </li>
            );
          })}
        </ul>
      </Container>
    </Container>
  );
}
