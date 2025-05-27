import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFlasher } from '../contexts/FlasherContext';
import { usePreferences } from '../contexts/PreferencesContext';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import PasswordChecklist from 'react-password-checklist';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { flash } = useFlasher();
  const { user, isAdmin } = useUser();
  const { allUsers } = useAdmin();
  const { fontPref } = usePreferences();
  const usersArr = Object.entries(allUsers).map(([_email, user]) => user);
  usersArr.sort((a, b) => a.full_name.localeCompare(b.full_name));

  let [oldPassword, setOldPassword] = useState('');
  let [password, setPassword] = useState('');
  let [passwordAgain, setPasswordAgain] = useState('');
  let [checklistOk, setChecklistOk] = useState(false);
  let [enableSubmit, setEnableSubmit] = useState(false);

  const defaultForWho = 'Select a user';
  let [forWho, setForWho] = useState(defaultForWho);
  let [forEmail, setForEmail] = useState('');
  let [isForOther, setIsForOther] = useState(false);

  const allowSetOthers = user && isAdmin;
  const oldPassNeeded = false; // was: user && !isForOther;

  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');

  if (!user && !token) {
    // If we are not logged in, and not resetting the password via email link,
    // then we should not be here.
    return <Navigate to="/" />;
  }

  // default password validation rules
  let minLen = 8;
  let rules = ['minLength', 'number', 'capital', 'match'];
  if (isForOther) {
    // allow simpler rules if setting password for another user
    minLen = 4;
    rules = ['minLength', 'match'];
  }

  function updateSubmitButton() {
    const otherOk = !isForOther || forEmail.length > 0;
    const oldOk = !oldPassNeeded || oldPassword.length > 0;
    const submitOk = otherOk && oldOk && checklistOk;
    setEnableSubmit(submitOk);
  }

  function handleChecklist(isValid) {
    setChecklistOk(isValid);
    updateSubmitButton();
  }

  function handleSetFor(user) {
    setForWho(user.full_name);
    setForEmail(user.email);
    updateSubmitButton();
  }

  function handlePasswordChange(event) {
    event.preventDefault();
    const { name, value } = event.target;
    if (name === 'oldPassword') setOldPassword(value);
    else if (name === 'password') setPassword(value);
    else if (name === 'passwordAgain') setPasswordAgain(value);
    updateSubmitButton();
  }

  async function handleSubmit() {
    if (user) {
      // changing password as an authenticated user
      const data = { oldPassword, password, forEmail };
      controlledLog('changing password data:');
      controlledLog(data);
      socketEmit('user_change_password', data);
    } else {
      // reset password via email link
      controlledLog('sending password reset for token ' + token);
      const response = await fetch('/api/reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      controlledLog('reset got response:', response);
      if (!response.ok) {
        const data = await response.json();
        const msg = 'Error in password reset: ' + data.error;
        flash(msg, 'danger');
        return;
      } else {
        const msg = 'Password reset successfully.';
        flash(msg, 'success');
      }
    }
    navigate('/');
  }

  return (
    <Container className="ChangePasswordPage">
      <div className={fontPref}>
        <Stack direction="vertical" className="mt-3" gap={3}>
          <h1>Change Password</h1>
          <Stack direction="horizontal" className="mt-3" gap={3}>
            <Stack direction="vertical" className="mt-4" gap={2}>
              {allowSetOthers && (
                <Stack direction="horizontal">
                  <Form.Check
                    type="switch"
                    checked={isForOther}
                    onChange={() => setIsForOther(!isForOther)}
                  />
                  <span>Change for someone</span>
                  <></>
                </Stack>
              )}

              {oldPassNeeded && (
                <div>
                  <div>
                    <label>Current Password:</label>
                    <input
                      name="oldPassword"
                      value={oldPassword}
                      type="password"
                      disabled={isForOther}
                      onChange={handlePasswordChange}
                      style={{ marginLeft: '15px' }}
                    />
                  </div>
                  <PasswordChecklist
                    rules={['minLength']}
                    minLength={1}
                    value={oldPassword}
                    messages={{
                      minLength:
                        'Current password is required to set new password.',
                    }}
                  />
                </div>
              )}
              <div className="mt-2">
                <label>New Password:</label>
                <br />
                <input
                  name="password"
                  value={password}
                  type="password"
                  onChange={handlePasswordChange}
                  style={{ marginLeft: '15px' }}
                />
              </div>
              <div>
                <label>Repeat New Password:</label>
                <br />
                <input
                  name="passwordAgain"
                  value={passwordAgain}
                  type="password"
                  onChange={handlePasswordChange}
                  style={{ marginLeft: '15px' }}
                />
              </div>
              <div>
                <PasswordChecklist
                  rules={rules}
                  minLength={minLen}
                  value={password}
                  valueAgain={passwordAgain}
                  onChange={handleChecklist}
                />
              </div>
              <Stack direction="horizontal">
                <div>
                  <button
                    type="submit"
                    disabled={!enableSubmit}
                    className="btn btn-primary reset-password-button"
                    onClick={() => handleSubmit()}
                    style={{ marginTop: '15px' }}
                  >
                    Reset Password
                  </button>
                </div>
              </Stack>
            </Stack>
            {isForOther && (
              <>
                <DropdownButton
                  title={forWho}
                  type="button"
                  variant="secondary"
                  className="select-user-dropdown mt-3"
                >
                  {usersArr.map((user, index) => {
                    return (
                      <Dropdown.Item
                        key={index}
                        as="button"
                        onClick={() => handleSetFor(user)}
                      >
                        {user.full_name}
                      </Dropdown.Item>
                    );
                  })}
                </DropdownButton>
              </>
            )}
            <div className="d-flex">&nbsp;</div>
          </Stack>
        </Stack>
      </div>
    </Container>
  );
}
