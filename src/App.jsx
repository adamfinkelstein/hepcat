import Container from 'react-bootstrap/Container';
import HeaderBar from './components/HeaderBar';
import AppRoutes from './components/AppRoutes';
import ModalDialog from './components/ModalDialog';
import ConfirmationBox from './components/ConfirmationBox';
import { BrowserRouter } from 'react-router';
import ControlledLogContext from './contexts/ControlledLogContext';
import SocketIOContext from './contexts/SocketIOContext';
import KeyContext from './contexts/KeyContext';
import UserContext from './contexts/UserContext';
import GridContext from './contexts/GridContext';
import AdminContext from './contexts/AdminContext';
import StickyContext from './contexts/StickyContext';
import CountContext from './contexts/CountContext';
import QueueContext from './contexts/QueueContext';
import FilterContext from './contexts/FilterContext';
import PreferencesContext from './contexts/PreferencesContext';
import FlasherContext from './contexts/FlasherContext';
import ModalDialogContext from './contexts/ModalDialogContext';
import ConfirmationBoxContext from './contexts/ConfirmationBoxContext';
import StorageContext from './contexts/StorageContext';
import ServerAlertContext from './contexts/ServerAlertContext';
import DownloadsContext from './contexts/DownloadsContext';

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
                          <DownloadsContext>
                            <ServerAlertContext>
                              <StickyContext>
                                <GridContext>
                                  <CountContext>
                                    <QueueContext>
                                      <FilterContext>
                                        <PreferencesContext>
                                          <ModalDialog />
                                          <ConfirmationBox />
                                          <HeaderBar />
                                          <AppRoutes />
                                        </PreferencesContext>
                                      </FilterContext>
                                    </QueueContext>
                                  </CountContext>
                                </GridContext>
                              </StickyContext>
                            </ServerAlertContext>
                          </DownloadsContext>
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
