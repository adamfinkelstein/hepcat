import Container from "react-bootstrap/Container"
import Navbar from './components/Navbar.js'
// import Body from './components/Body.js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage.js'
import AppContext from './contexts/AppContext.js'
import PreferencesContext from './contexts/PreferencesContext'
import PreferencesPage from "./pages/PreferencesPage.js";
import AboutPage from "./pages/AboutPage.js";
import ChangePasswordPage from "./pages/ChangePasswordPage.js";
import FlasherContext from './contexts/FlasherContext.js';
import GUIContext from "./contexts/GUIContext.js";

export default function App() {
  
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <FlasherContext>
          <PreferencesContext>
              <AppContext>
                <GUIContext>
                  <Navbar/>
                  <Routes>
                      <Route path="/" element={<MainPage/>}/>
                      <Route path="/about" element={<AboutPage/>}/>
                      <Route path="/preferences" element={<PreferencesPage/>}/>
                      <Route path="/change_password" element={<ChangePasswordPage/>}/>
                      <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </GUIContext>
              </AppContext>
            </PreferencesContext>
        </FlasherContext>
      </BrowserRouter>
    </Container>
  );
}