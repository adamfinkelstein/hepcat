// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import QueueElement from './QueueElement';

export default function Queue() {
  const { isScreenOrOutside } = useUser();
  const { queue, queueCurrent } = useQueue();
  const { showConflicts, setShowConflicts, showStars, setShowStars } =
    usePreferences();
  const counter = queueCurrent + 1;
  const currentCount =
    counter > queue.length ? 'completed' : 'Q' + counter + ' of';
  const past_max = isScreenOrOutside() ? 0 : 3;
  const future_max = 12;
  const start_index = Math.max(0, queueCurrent - past_max);
  const end_index = Math.min(counter + future_max, queue.length);
  const queueSlice = queue.slice(start_index, end_index);

  function getQEntryClass(index) {
    let className = 'q-entry';
    if (index === queueCurrent) {
      className += ' Current';
      return className;
    }
    if (index < queueCurrent) {
      className += ' past-entry';
    }
    if (index % 2) {
      className += ' odd-entry';
    }
    return className;
  }

  return (
    <Container fluid className="Queue">
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
