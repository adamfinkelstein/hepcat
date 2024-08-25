import Button from 'react-bootstrap/Button';
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useFlasher } from '../contexts/FlasherContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const emailField = useRef();
  const { socketLogin } = useSocketIO();
  const { flash } = useFlasher();

  const handleLoginButton = (ev) => {
    ev.preventDefault();
    socketLogin(email, password, remember, (error) => {
      if (error) {
        flash(error, 'danger');
      }
    });
    navigate('/');
  };

  const handleInputChange = (event) => {
    const target = event.target;
    if (target.name === 'email') setEmail(target.value);
    else if (target.name === 'password') setPassword(target.value);
    else if (target.name === 'remember') setRemember(target.checked);
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
          <div className="form-group mt-3">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="form-check-input"
              onChange={handleInputChange}
            />
            &nbsp;
            <label htmlFor="remember" className="form-check-label">
              Remember me for one week
            </label>
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
              <NavLink to="/forgot_password">Forgot password?</NavLink>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
