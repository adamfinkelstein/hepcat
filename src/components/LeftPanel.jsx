// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import Queue from './Queue';
import ChooseRoom from './ChooseRoom';

export default function LeftPanel() {
  const { isAdmin } = useUser();
  const { queue, roomGlobs } = useQueue();
  const { fontPref } = usePreferences();
  const hideQueue = !isAdmin && roomGlobs?.hide_queue;
  const hideMessage = roomGlobs?.message
    ? roomGlobs.message
    : 'The queue is hidden.';
  const message = hideQueue ? hideMessage : 'No papers in queue.';

  return (
    <Container fluid className="LeftPanel">
      <div className={fontPref}>
        <ChooseRoom />
        {queue.length && !hideQueue ? (
          <Queue />
        ) : (
          <div className="queue-message">{message}</div>
        )}
      </div>
    </Container>
  );
}
