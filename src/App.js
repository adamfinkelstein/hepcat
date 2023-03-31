import Container from "react-bootstrap/Container"
import HeaderBar from './components/HeaderBar.js'
import AppRoutes from './components/AppRoutes.js'
import ModalDialog from './components/ModalDialog.js'
// import Body from './components/Body.js'
import { BrowserRouter } from 'react-router-dom';
// import MainPage from './pages/MainPage.js'
import AppContext from './contexts/AppContext.js'
import PreferencesContext from './contexts/PreferencesContext'
// import PreferencesPage from "./pages/PreferencesPage.js";
// import AboutPage from "./pages/AboutPage.js";
// import LoginPage from "./pages/LoginPage.js";
// import ChangePasswordPage from "./pages/ChangePasswordPage.js";
// import {useAppGlobals} from './contexts/AppContext.js'
import FlasherContext from './contexts/FlasherContext.js';
import GUIContext from "./contexts/GUIContext.js";

export default function App() {
  
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <FlasherContext>
          <AppContext>
            <PreferencesContext>
                <GUIContext>
                  <ModalDialog/>
                  <HeaderBar/>
                  <AppRoutes/>
                </GUIContext>
              </PreferencesContext>
            </AppContext>
        </FlasherContext>
      </BrowserRouter>
    </Container>
  );
}