import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import { useAppGlobals } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import QueueElement from './QueueElement.js';
import AdminQueueControls from './AdminQueueControls';

export default function Queue() {
  const { user, isAdmin, isScreenOrOutside } = useUser();
  const globals = useAppGlobals();
  const { showConflicts, setShowConflicts, showStars, setShowStars } =
    usePreferences();
  const queue = globals.queue;
  const current = globals.queueCurrent;
  const counter = current + 1;
  const currentCount =
    counter > queue.length ? 'completed' : 'Q' + counter + ' of';
  const past_max = isScreenOrOutside() ? 0 : 3;
  const future_max = 12;
  const start_index = Math.max(0, current - past_max);
  const end_index = Math.min(counter + future_max, queue.length);
  const queueSlice = queue.slice(start_index, end_index);
  const serverGlobs = globals?.serverGlobs;
  const hideQueue = serverGlobs?.hide_queue;
  const hideMessage = serverGlobs?.message
    ? serverGlobs.message
    : 'The queue is hidden.';

  function getQEntryClass(index) {
    let className = 'q-entry';
    if (index === globals.queueCurrent) {
      className += ' Current';
      return className;
    }
    if (index < globals.queueCurrent) {
      className += ' past-entry';
    }
    if (index % 2) {
      className += ' odd-entry';
    }
    return className;
  }

  return (
    <Container fluid className="Queue">
      {user && isAdmin && <AdminQueueControls />}
      <Container fluid>
        {hideQueue && (
          <div className="bigger-font queue-message">
            Queue hidden for non-admin users, with this message: <br />{' '}
            {hideMessage}
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
              checked={showConflicts}
              onChange={() => {
                setShowConflicts(!showConflicts);
              }}
            />
            <Form.Check
              label="Stars"
              type="checkbox"
              checked={showStars}
              onChange={() => {
                setShowStars(!showStars);
              }}
            />
          </Stack>
        </Stack>
      </Container>
      <Container fluid className="mt-2 q-list-container">
        <ul>
          {queueSlice.map((paper, index) => {
            return (
              <li key={index} className={getQEntryClass(index + start_index)}>
                <QueueElement paper={paper} />
              </li>
            );
          })}
        </ul>
      </Container>
    </Container>
  );
}
