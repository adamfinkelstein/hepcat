import Container from 'react-bootstrap/Container';
import HeaderBar from './components/HeaderBar.js';
import AppRoutes from './components/AppRoutes.js';
import ModalDialog from './components/ModalDialog.js';
import ConfirmationBox from './components/ConfirmationBox.js';
import { BrowserRouter } from 'react-router-dom';
import ControlledLogContext from './contexts/ControlledLogContext.js';
import SocketIOContext from './contexts/SocketIOContext.js';
import UserContext from './contexts/UserContext.js';
import AppContext from './contexts/AppContext.js';
import FilterContext from './contexts/FilterContext.js';
import PreferencesContext from './contexts/PreferencesContext';
import FlasherContext from './contexts/FlasherContext.js';
import ModalDialogContext from './contexts/ModalDialogContext.js';
import ConfirmationBoxContext from './contexts/ConfirmationBoxContext.js';

export default function App() {
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <ControlledLogContext>
          <ModalDialogContext>
            <ConfirmationBoxContext>
              <FlasherContext>
                <SocketIOContext>
                  <UserContext>
                    <AppContext>
                      <FilterContext>
                        <PreferencesContext>
                          <ModalDialog />
                          <ConfirmationBox />
                          <HeaderBar />
                          <AppRoutes />
                        </PreferencesContext>
                      </FilterContext>
                    </AppContext>
                  </UserContext>
                </SocketIOContext>
              </FlasherContext>
            </ConfirmationBoxContext>
          </ModalDialogContext>
        </ControlledLogContext>
      </BrowserRouter>
    </Container>
  );
}
