import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
//import NavItem from "react-bootstrap/NavItem";
import { NavLink } from 'react-router-dom';
import { useAppGlobals } from '../contexts/AppContext';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faUser } from '@fortawesome/free-solid-svg-icons'

export default function HeaderBar() {
  const globals = useAppGlobals();
  const controlledLog = globals.controlledLog;
  const user = globals.user;
  const isAdmin = globals.isAdmin;
  let userNamePlus = user && user.full_name ? user.full_name : 'User';
  if (isAdmin) {
    userNamePlus += ' (Admin)';
  }
  if (user && user.rooms) {
    userNamePlus += ' [' + user.rooms + ']';
  }

  return (
    <Navbar bg="dark" variant="dark" fixed="top">
      <Container>
        <Navbar.Brand as={NavLink} to="/">
          Hepcat: SIGGRAPH PC Meeting
        </Navbar.Brand>

        <Navbar.Collapse id="navbarScroll">
          <Nav
            className="me-auto my-2 my-lg-0"
            style={{ maxHeight: '200px' }}
            navbarScroll
          >
            {user && (
              <NavDropdown title={userNamePlus} id="navbarScrollingDropdown">
                <NavDropdown.Item as={NavLink} to="/">
                  PC Meeting
                </NavDropdown.Item>
                <NavDropdown.Item as={NavLink} to="about">
                  About
                </NavDropdown.Item>
                <NavDropdown.Item as={NavLink} to="preferences">
                  Preferences
                </NavDropdown.Item>
                {isAdmin && (
                  <>
                    <NavDropdown.Item as={NavLink} to="uploads">
                      Upload Files
                    </NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="users">
                      Users
                    </NavDropdown.Item>
                  </>
                )}
                <NavDropdown.Item as={NavLink} to="change_password">
                  Change Password
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item
                  onClick={() => {
                    controlledLog('clicked logout');
                    window.location.href = '/auth/logout';
                  }}
                >
                  Log Out
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
