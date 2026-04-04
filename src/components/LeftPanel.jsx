// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import Queue from './Queue';
import BoxMsg from './BoxMsg';
import ChooseRoom from './ChooseRoom';
import AdminQueueControls from './AdminQueueControls';

export default function LeftPanel() {
  const { isAdmin } = useUser();
  const { queue, roomGlobs } = useQueue();
  const { fontPref } = usePreferences();
  const hideQueue = roomGlobs?.hide_queue;
  const globsMsg = roomGlobs?.message;
  const noPapers = !queue?.length;
  const noQueue = noPapers || (hideQueue && !isAdmin);
  let msg = false;
  if (hideQueue) {
    msg = globsMsg ? globsMsg : 'The queue is hidden.';
    if (isAdmin) {
      const extra = 'Queue hidden for non-admins, saying: ';
      msg = extra + msg;
    }
  } else if (noPapers) {
    msg = 'No papers in queue.';
  }

  return (
    <Container fluid className="LeftPanel">
      <div className={fontPref}>
        <ChooseRoom />
        {isAdmin && <AdminQueueControls />}
        {msg && <BoxMsg msg={msg} />}
        {!noQueue && <Queue />}
      </div>
    </Container>
  );
}
