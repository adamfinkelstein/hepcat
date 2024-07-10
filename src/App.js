import Container from 'react-bootstrap/Container';
import HeaderBar from './components/HeaderBar';
import AppRoutes from './components/AppRoutes';
import ModalDialog from './components/ModalDialog';
import ConfirmationBox from './components/ConfirmationBox';
import { BrowserRouter } from 'react-router-dom';
import ControlledLogContext from './contexts/ControlledLogContext';
import SocketIOContext from './contexts/SocketIOContext';
import UserContext from './contexts/UserContext';
import AppContext from './contexts/AppContext';
import FilterContext from './contexts/FilterContext';
import StatsContext from './contexts/StatsContext';
import PreferencesContext from './contexts/PreferencesContext';
import FlasherContext from './contexts/FlasherContext';
import ModalDialogContext from './contexts/ModalDialogContext';
import ConfirmationBoxContext from './contexts/ConfirmationBoxContext';

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
                        <StatsContext>
                          <PreferencesContext>
                            <ModalDialog />
                            <ConfirmationBox />
                            <HeaderBar />
                            <AppRoutes />
                          </PreferencesContext>
                        </StatsContext>
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
