// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import { BrowserRouter } from 'react-router';
import DownloadFile from './components/DownloadFile';
import HeaderBar from './components/HeaderBar';
import AppRoutes from './components/AppRoutes';
import ModalDialog from './components/ModalDialog';
import ConfirmationBox from './components/ConfirmationBox';
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
                          <ServerAlertContext>
                            <StickyContext>
                              <GridContext>
                                <CountContext>
                                  <QueueContext>
                                    <FilterContext>
                                      <PreferencesContext>
                                        <DownloadFile />
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
