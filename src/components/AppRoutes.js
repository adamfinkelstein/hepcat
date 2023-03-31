import { Routes, Route, Navigate } from 'react-router-dom';

import MainPage from '../pages/MainPage.js'
import PreferencesPage from "../pages/PreferencesPage.js";
import AboutPage from "../pages/AboutPage.js";
import LoginPage from "../pages/LoginPage.js";
import UploadsPage from "../pages/UploadsPage.js";
import ChangePasswordPage from "../pages/ChangePasswordPage.js";


// import Navbar from 'react-bootstrap/Navbar';
// import Container from 'react-bootstrap/Container';
// import Nav from "react-bootstrap/Nav";
// import NavDropdown from "react-bootstrap/NavDropdown";
// //import NavItem from "react-bootstrap/NavItem";
// import { NavLink } from 'react-router-dom';
import {useAppGlobals} from '../contexts/AppContext'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faUser } from '@fortawesome/free-solid-svg-icons'


export default function AppRoutes() {

  const globals = useAppGlobals();
  const controlledLog = globals.controlledLog
  const loggedIn = Boolean(globals.user);
  const isAdmin = globals.isAdmin
  controlledLog("user:")
  controlledLog(globals.user)

  return (
    loggedIn ?
      (<Routes>
          <Route path="/" element={<MainPage/>}/>
          <Route path="/about" element={<AboutPage/>}/>
          <Route path="/preferences" element={<PreferencesPage/>}/>
          { isAdmin &&
            <Route path="/uploads" element={<UploadsPage/>}/>
          }
          <Route path="/change_password" element={<ChangePasswordPage/>}/>
          <Route path="*" element={<Navigate to="/" />} />
      </Routes>)
      :
      (<Routes>
        <Route path="/auth_login" element={<LoginPage/>}/>
        <Route path="*" element={<Navigate to="/auth_login" />} />
      </Routes>)
  );
}