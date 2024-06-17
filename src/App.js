import Container from 'react-bootstrap/Container';
import HeaderBar from './components/HeaderBar.js';
import AppRoutes from './components/AppRoutes.js';
import ModalDialog from './components/ModalDialog.js';
import { BrowserRouter } from 'react-router-dom';
import ControlledLogContext from './contexts/ControlledLogContext.js';
import SocketIOContext from './contexts/SocketIOContext.js';
import UserContext from './contexts/UserContext.js';
import AppContext from './contexts/AppContext.js';
import PreferencesContext from './contexts/PreferencesContext';
import FlasherContext from './contexts/FlasherContext.js';
import GUIContext from './contexts/GUIContext.js';
import ModalDialogContext from './contexts/ModalDialogContext.js';

export default function App() {
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <ControlledLogContext>
          <ModalDialogContext>
            <FlasherContext>
              <SocketIOContext>
                <UserContext>
                  <AppContext>
                    <PreferencesContext>
                      <GUIContext>
                        <ModalDialog />
                        <HeaderBar />
                        <AppRoutes />
                      </GUIContext>
                    </PreferencesContext>
                  </AppContext>
                </UserContext>
              </SocketIOContext>
            </FlasherContext>
          </ModalDialogContext>
        </ControlledLogContext>
      </BrowserRouter>
    </Container>
  );
}
