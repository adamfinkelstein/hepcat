import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Badge from 'react-bootstrap/Badge';
import { NavLink } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useFontInfo } from '../contexts/PreferencesContext';

export default function HeaderBar() {
  const { controlledLog } = useControlledLog();
  const { user, isAdmin, allUsers } = useUser();
  const { socketLogout } = useSocketIO();
  const { currentFontStyle } = useFontInfo();

  function countOnlineUsers() {
    if (!isAdmin) return 0;
    let count = 0;
    for (const [email, user] of Object.entries(allUsers)) {
      if (email && user.is_online) count++;
    }
    return count;
  }

  function getHeaderBarName() {
    let headerBarName = user && user.full_name ? user.full_name : 'User';
    if (isAdmin) {
      headerBarName += ' (Admin)';
    }
    if (user && user.rooms) {
      const roomCodes = user.rooms.replace(/Room_/g, '');
      headerBarName += ' [' + roomCodes + ']';
    }
    return headerBarName;
  }

  const onlineCount = countOnlineUsers();
  const headerBarName = getHeaderBarName();

  return (
    <>
      <Navbar bg="dark" variant="dark" fixed="top" className="HeaderBar">
        <Container fluid className={currentFontStyle}>
          <Navbar.Brand as={NavLink} to="/">
            Hepcat: SIGGRAPH PC Meeting
          </Navbar.Brand>

          <Navbar.Collapse id="navbarScroll">
            <Nav
              className="me-auto my-2 my-lg-0 RightSideNav"
              style={{ maxHeight: '200px' }}
              navbarScroll
            >
              {user && (
                <>
                  {isAdmin && (
                    <Nav.Item>
                      <Nav.Link as={NavLink} to="users">
                        Online: <Badge bg="success">{onlineCount}</Badge>
                      </Nav.Link>
                    </Nav.Item>
                  )}
                  <NavDropdown
                    title={headerBarName}
                    id="navbarScrollingDropdown"
                  >
                    <NavDropdown.Item as={NavLink} to="/">
                      PC Meeting
                    </NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="guide">
                      User Guide
                    </NavDropdown.Item>
                    <NavDropdown.Item as={NavLink} to="preferences">
                      Preferences
                    </NavDropdown.Item>
                    {isAdmin && (
                      <>
                        <NavDropdown.Item as={NavLink} to="uploads">
                          Upload Files
                        </NavDropdown.Item>
                        <NavDropdown.Item as={NavLink} to="progress">
                          Progress
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
                        socketLogout(true);
                      }}
                    >
                      Log Out
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <div className={currentFontStyle}>
        <div className="HeaderBarSpacer"></div>
      </div>
    </>
  );
}
