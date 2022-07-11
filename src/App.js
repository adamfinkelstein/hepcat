import Container from "react-bootstrap/Container"
import Navbar from './components/Navbar.js'
import Body from './components/Body.js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage.js'
import AppContext from './contexts/AppContext.js'
import PreferencesContext from './contexts/PreferencesContext'
import PreferencesPage from "./pages/PreferencesPage.js";
import SetQueuePage from "./pages/SetQueuePage.js";

export default function App() {
  
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <PreferencesContext>
          <AppContext>
            <Navbar/>
            <Routes>
                <Route path="/" element={<MainPage/>}/>
                <Route path="/preferences" element={<PreferencesPage/>}/>
                <Route path="/set_queue" element={<SetQueuePage/>}/>
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppContext>
        </PreferencesContext>
      </BrowserRouter>
    </Container>
  );
}