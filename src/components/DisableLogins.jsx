// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { useCallback } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';

export default function DisableLogins() {
  const { disableLogins, updateDisableLogins } = useAdmin();
  const { revealConfirmationBox } = useConfirmationBox();
  // const [disableLogins, updateDisableLogins] = useState(false);
  const disabledClass = disableLogins ? 'text-primary' : 'text-muted';
  const allowedClass = disableLogins ? 'text-muted' : 'text-primary';

  const confirmDisable = useCallback(
    (e) => {
      e.preventDefault(); // wait for confirmation from server
      if (disableLogins) {
        updateDisableLogins(false); // no confirmation switching to allow
      } else {
        const text =
          'Are you really sure you want to disable non-admin logins?' +
          ' This will also log out any non-admins currently logged in.';
        revealConfirmationBox('Please Confirm', text, (confirmed) => {
          if (confirmed) {
            updateDisableLogins(true);
          }
        });
      }
    },
    [disableLogins, updateDisableLogins, revealConfirmationBox]
  );

  return (
    <Stack className="DisableLogins fw-bold" direction="horizontal">
      <span className={disabledClass}>Disable</span>
      <Form.Check
        type="switch"
        checked={!disableLogins}
        className="ms-2"
        onChange={(e) => confirmDisable(e)}
      />
      <span className={allowedClass}>Allow non-admin logins</span>
    </Stack>
  );
}
