import { Routes, Route, Navigate } from 'react-router-dom';

import MainPage from '../pages/MainPage.js';
import PreferencesPage from '../pages/PreferencesPage.js';
import AboutPage from '../pages/AboutPage.js';
import LoginPage from '../pages/LoginPage.js';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.js';
import UploadsPage from '../pages/UploadsPage.js';
import UsersPage from '../pages/UsersPage.js';
import ChangePasswordPage from '../pages/ChangePasswordPage.js';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useUser } from '../contexts/UserContext';
import { useSocketIO } from '../contexts/SocketIOContext';

export default function AppRoutes() {
  const { socket } = useSocketIO();
  const { user, isAdmin } = useUser();
  const { controlledLog } = useControlledLog();
  controlledLog(user);

  if (socket === undefined) {
    // too early to render, wait for the socket to be either
    // null (not logged in) or a Socket.IO instance
    return null;
  }

  return (
    <>
      {!user ? (
        <Routes>
          <Route path="/forgot_password" element={<ForgotPasswordPage />} />
          <Route path="/change_password" element={<ChangePasswordPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          {isAdmin && (
            <>
              <Route path="/uploads" element={<UploadsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </>
          )}
          <Route path="/change_password" element={<ChangePasswordPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </>
  );
}
