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
  const currentCount = counter > queue.length ? 'completed' : counter + ' of';
  const isScreen = user && user.role_name === 'Screen';
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

    let className = 'queue_element';
    if (index === globals.queueCurrent) {
      className += ' Current';
    } else if (index < globals.queueCurrent) {
      className += ' Past';
      if (!isScreen && !isConflict) {
        className += ' ' + paper.status;
      }
    } else if (index % 2) {
      // future - odd?
      className += ' odd_row';
    }
    return className;
  }

  return (
    <Container className="Queue">
      {user && isAdmin && <AdminQueueControls />}
      <Container className="expand-bar">
        {hideQueue && (
          <div className="font-size-3 queue-hidden-for-non">
            (Queue is hidden for non-admin users, with this message: {hiddenMsg}
            )
          </div>
        )}
        <Stack direction="horizontal">
          <span className="font-size-2">
            Current: {currentCount} {queue.length}
          </span>
          <Stack direction="horizontal" className="q-show-checks">
            <div className="font-size-4">
              <strong>Show:&nbsp;&nbsp;&nbsp;</strong>
            </div>
            <Form.Check
              label="Conflicts"
              type="checkbox"
              checked={showConflictsInQ}
              onChange={() => {
                setShowConflictsInQ(!showConflictsInQ);
              }}
            />
            <span className="font-size-4">&nbsp;&nbsp;&nbsp;&nbsp;</span>
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
      <Container className="queue-container custom-font-size">
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
