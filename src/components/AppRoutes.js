import { Routes, Route, Navigate } from 'react-router-dom';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useUser } from '../contexts/UserContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import MainPage from '../pages/MainPage';
import PreferencesPage from '../pages/PreferencesPage';
import AboutPage from '../pages/AboutPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import UploadsPage from '../pages/UploadsPage';
import ProgressPage from '../pages/ProgressPage';
import UsersPage from '../pages/UsersPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';

export default function AppRoutes() {
  const { socket } = useSocketIO();
  const { user, isAdmin } = useUser();
  const { controlledLog } = useControlledLog();
  controlledLog(user);

  if (socket === undefined || user === undefined) {
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
              <Route path="/progress" element={<ProgressPage />} />
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
