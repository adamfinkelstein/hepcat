import Button from 'react-bootstrap/Button';
import { useState } from 'react';

export default function LoginPage() {
  let [email, setEmail] = useState('');
  let [password, setPassword] = useState('');

  const handleLoginButton = () => {
    alert('login button pressed. email=' + email + ' password=' + password);
  };

  const handleInputChange = (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.name === 'email') setEmail(target.value);
    else if (target.name === 'password') setPassword(target.value);
  };

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
              value={email}
              className="form-control mt-1"
              placeholder="Enter email"
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group mt-3">
            <label>Password</label>
            <input
              name="password"
              type="password"
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
