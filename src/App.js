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
import AdminContext from './contexts/AdminContext';
import StickyContext from './contexts/StickyContext';
import CountContext from './contexts/CountContext';
import AppContext from './contexts/AppContext';
import FilterContext from './contexts/FilterContext';
import PreferencesContext from './contexts/PreferencesContext';
import FlasherContext from './contexts/FlasherContext';
import ModalDialogContext from './contexts/ModalDialogContext';
import ConfirmationBoxContext from './contexts/ConfirmationBoxContext';
import StorageContext from './contexts/StorageContext';

export default function App() {
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <ControlledLogContext>
          <ModalDialogContext>
            <ConfirmationBoxContext>
              <FlasherContext>
                <StorageContext>
                  <SocketIOContext>
                    <AdminContext>
                      <KeyContext>
                        <UserContext>
                          <StickyContext>
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
                          </StickyContext>
                        </UserContext>
                      </KeyContext>
                    </AdminContext>
                  </SocketIOContext>
                </StorageContext>
              </FlasherContext>
            </ConfirmationBoxContext>
          </ModalDialogContext>
        </ControlledLogContext>
      </BrowserRouter>
    </Container>
  );
}
