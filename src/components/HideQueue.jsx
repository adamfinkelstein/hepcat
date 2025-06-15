// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';

export default function HideQueue() {
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const { locHideQ, setLocHideQ, locHideMsg, setLocHideMsg } = useAdmin();
  const qMsgLabel = locHideQ ? 'Queue hidden with:' : 'Hide queue message:';

  function handleHideQueueCheckbox() {
    const hide = !locHideQ;
    setLocHideQ(hide);
    const message = hide && locHideMsg ? locHideMsg : '';
    const data = { roomChoice, hide, message };
    socketEmit('admin_hide_queue', data);
    controlledLog('admin_hide_queue:', data);
  }

  return (
    <div className="HideQueue">
      <h2>Hide Queue</h2>
      <Stack direction="horizontal" gap={2}>
        <span>{qMsgLabel}</span>
        <input
          className="q-message-input"
          value={locHideMsg}
          onChange={(e) => setLocHideMsg(e.target.value)}
          disabled={locHideQ}
        />
      </Stack>
      <Stack direction="horizontal" gap={2}>
        <Form.Check
          type="checkbox"
          checked={locHideQ}
          onChange={handleHideQueueCheckbox}
        />
        <span>Hide queue now.</span>
      </Stack>
    </div>
  );
}
