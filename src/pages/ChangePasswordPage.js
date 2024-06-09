import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Form from 'react-bootstrap/Form';
import PasswordChecklist from 'react-password-checklist';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { controlledLog } = useControlledLog();
  const { socketEmit, isPasswordReset, setIsPasswordReset } = useSocketIO();
  const { isAdmin, allUsers } = useUser();
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

  const allowSetOthers = isAdmin && !isPasswordReset;
  const oldPassNeeded = !isForOther && !isPasswordReset;

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

  /*
  function resetGUI() {
    setOldPassword('');
    setPassword('');
    setPasswordAgain('');
    setForEmail('');
    setForWho(defaultForWho);
    setIsForOther(false);
    setEnableSubmit(false);
  }
  */

  function handleSubmit() {
    const data = { oldPassword, password, forEmail };
    controlledLog('changing password data:');
    controlledLog(data);
    socketEmit('user_change_password', data);
    // resetGUI(); // do we need this if we navigate away next?
    setIsPasswordReset(false);
    navigate('/');
  }

  return (
    <Container className="ChangePasswordPage">
      <Container className="change-password-main-container">
        <span className="font-size-1">Change Password</span>
        <div className="password-fields">
          {allowSetOthers && (
            <Stack direction="horizontal" className="password-switch-stack">
              <Form.Check
                type="switch"
                defaultChecked={isForOther}
                className="password-switch"
                onChange={() => setIsForOther(!isForOther)}
              />
              <span className="font-size-4">Change for someone else</span>
              {isForOther && (
                <>
                  <span>&nbsp;&mdash;&nbsp;</span>
                  <DropdownButton
                    title={forWho}
                    type="button"
                    variant="secondary"
                    className="select-user-dropdown"
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
            </Stack>
          )}

          {oldPassNeeded && (
            <div>
              <div className="reset-password-row">
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
          <div className="reset-password-row">
            <label>New Password:</label>
            <input
              name="password"
              value={password}
              type="password"
              onChange={handlePasswordChange}
              style={{ marginLeft: '15px' }}
            />
          </div>
          <div className="reset-password-row">
            <label>Repeat New Password:</label>
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
        </div>
      </Container>
    </Container>
  );
}
