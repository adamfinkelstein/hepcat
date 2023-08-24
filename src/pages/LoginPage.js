import Button from 'react-bootstrap/Button';
import { useState, useEffect, useRef } from 'react';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useFlasher } from '../contexts/FlasherContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailField = useRef();
  const { socketLogin } = useSocketIO();
  const { flash } = useFlasher();

  const handleLoginButton = (ev) => {
    ev.preventDefault();
    socketLogin(email, password, (error) => {
      if (error) {
        flash(error, 'danger');
      }
    });
  };

  const handleInputChange = (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.name === 'email') setEmail(target.value);
    else if (target.name === 'password') setPassword(target.value);
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
          <h3 className="Auth-form-title">Sign In</h3>
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
          <div className="form-group mt-3">
            <label>Password</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              className="form-control mt-1"
              placeholder="Enter password"
              onChange={handleInputChange}
            />
          </div>
          <div className="d-grid gap-2 mt-3">
            <Button
              type="submit"
              className="btn btn-primary"
              onClick={handleLoginButton}
            >
              Login
            </Button>
            <p className="forgot-password text-right mt-2">
              Forgot password? Concat an admin.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
