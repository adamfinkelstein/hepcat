import Container from 'react-bootstrap/Container';
import HeaderBar from './components/HeaderBar';
import AppRoutes from './components/AppRoutes';
import ModalDialog from './components/ModalDialog';
import ConfirmationBox from './components/ConfirmationBox';
import { BrowserRouter } from 'react-router-dom';
import ControlledLogContext from './contexts/ControlledLogContext';
import SocketIOContext from './contexts/SocketIOContext';
import KeyContext from './contexts/KeyContext';
import UserContext from './contexts/UserContext';
import GridContext from './contexts/GridContext';
import CountContext from './contexts/CountContext';
import AppContext from './contexts/AppContext';
import FilterContext from './contexts/FilterContext';
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
                  <KeyContext>
                    <UserContext>
                      <GridContext>
                        <CountContext>
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
                        </CountContext>
                      </GridContext>
                    </UserContext>
                  </KeyContext>
                </SocketIOContext>
              </FlasherContext>
            </ConfirmationBoxContext>
          </ModalDialogContext>
        </ControlledLogContext>
      </BrowserRouter>
    </Container>
  );
}
