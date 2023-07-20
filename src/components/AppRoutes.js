import { Routes, Route, Navigate } from 'react-router-dom';

import MainPage from '../pages/MainPage.js'
import PreferencesPage from "../pages/PreferencesPage.js";
import AboutPage from "../pages/AboutPage.js";
import UploadsPage from "../pages/UploadsPage.js";
import UsersPage from "../pages/UsersPage.js";
import ChangePasswordPage from "../pages/ChangePasswordPage.js";
import {useAppGlobals} from '../contexts/AppContext'

export default function AppRoutes() {

  const globals = useAppGlobals();
  const controlledLog = globals.controlledLog
  const isAdmin = globals.isAdmin
  controlledLog(globals.user)

  return (
      <Routes>
          <Route path="/" element={<MainPage/>}/>
          <Route path="/about" element={<AboutPage/>}/>
          <Route path="/preferences" element={<PreferencesPage/>}/>
          { isAdmin &&
          <>
            <Route path="/uploads" element={<UploadsPage/>}/>
            <Route path="/users" element={<UsersPage/>}/>
          </>
          }
          <Route path="/change_password" element={<ChangePasswordPage/>}/>
          <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
}