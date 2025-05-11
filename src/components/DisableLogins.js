import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { useCallback } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';

export default function DisableLogins() {
  const { disableLogins, updateDisableLogins } = useAdmin();
  const { revealConfirmationBox } = useConfirmationBox();
  // const [disableLogins, updateDisableLogins] = useState(false);
  const disabledClass = disableLogins ? 'text-dark' : 'text-muted';
  const enabledClass = disableLogins ? 'text-muted' : 'text-dark';

  const confirmDisable = useCallback(
    (e) => {
      if (disableLogins) {
        updateDisableLogins(false); // no confirmation for uncheck
      } else {
        const text =
          'Are you really sure you want to disable non-admin logins?' +
          ' This will also log out any non-admins currently logged in.';
        revealConfirmationBox('Please Confirm', text, (confirmed) => {
          updateDisableLogins(confirmed);
          if (!confirmed) {
            e.target.checked = false; // cancel: uncheck the switch
          }
        });
      }
    },
    [disableLogins, updateDisableLogins, revealConfirmationBox],
  );

  return (
    <Stack className="DisableLogins fw-bold" direction="horizontal">
      <span className={enabledClass}>Enable</span>
      <Form.Check
        type="switch"
        checked={disableLogins}
        className="ms-2"
        onChange={(e) => confirmDisable(e)}
      />
      <span className={disabledClass}>Disable</span>
      <span className="text-dark">&nbsp;non-admin logins</span>
    </Stack>
  );
}
