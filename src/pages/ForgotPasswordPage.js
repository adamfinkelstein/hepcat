import Button from 'react-bootstrap/Button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const emailField = useRef();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const navigate = useNavigate();

  const handleResetButton = async (ev) => {
    ev.preventDefault();
    const response = await fetch('/api/reset_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const data = await response.json();
      const msg =
        'Error in password reset request (' + email + '):' + data.error;
      // flash(msg, 'danger');
      revealModalDialog('Error', msg);
      return;
    } else {
      const msg =
        'Email just sent to ' + email + ' with a link to reset password.';
      flash(msg, 'success');
    }
    navigate('/login');
  };

  const handleInputChange = (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.name === 'email') setEmail(target.value);
  };

  useEffect(() => {
    // set focus on the email field
    if (emailField.current) {
      emailField.current.focus();
    }
  }, [emailField]);

  return (
    <div className="LoginPage">
      <form className="Auth-form">
        <div className="Auth-form-content">
          <h3 className="Auth-form-title">Forgot Password</h3>
          <div className="form-group mt-3">
            <label>Email address</label>
            <input
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              className="form-control mt-1"
              placeholder="Enter email"
              onChange={handleInputChange}
              ref={emailField}
            />
          </div>
          <div className="d-grid gap-2 mt-3">
            <Button
              type="submit"
              className="btn btn-primary"
              onClick={handleResetButton}
            >
              Request Password Reset
            </Button>
            <p className="text-right mt-2">
              <NavLink to="/login">Back to Login</NavLink>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
