import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import NavItem from "react-bootstrap/NavItem";
import { NavLink } from 'react-router-dom';
import {useUser} from '../contexts/AppContext'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faUser } from '@fortawesome/free-solid-svg-icons'


export default function Header() {

  let user = useUser()
  return (
    <Navbar bg="dark" variant="dark" fixed="top">
      <Container>
        <Navbar.Brand as={NavLink} to="/">Hepcat: SIGGRAPH PC Meeting</Navbar.Brand>

        <Navbar.Collapse id="navbarScroll">
          <Nav
            className="me-auto my-2 my-lg-0"
            style={{ maxHeight: '100px' }}
            navbarScroll
          >
            {
              user && 
              <NavDropdown title={user.full_name} id="navbarScrollingDropdown">
                <NavDropdown.Item as={NavLink} to="preferences">Preferences</NavDropdown.Item>
                {
                  user.role_name === "Admin" &&
                  <NavDropdown.Item onClick={() => {window.location.href = '/upload'}}>Upload Files</NavDropdown.Item>
                }
                <NavDropdown.Item as={NavLink} to="change_password">Change Password</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => {
                  window.location.href = '/auth/logout'
                }}>Log Out</NavDropdown.Item>
            </NavDropdown>
            }

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}