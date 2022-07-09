import Container from "react-bootstrap/Container"
import Navbar from './components/Navbar.js'
import Body from './components/Body.js'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage.js'
import AppContext from './contexts/AppContext.js'
import ColorsContext from './contexts/ColorContext.js'
import PreferencesPage from "./pages/PreferencesPage.js";

export default function App() {
  
  return (
    <Container fluid className="App">
      <BrowserRouter>
        <ColorsContext>
          <AppContext>
            <Navbar/>
            <Routes>
                <Route path="/" element={<MainPage/>}/>
                <Route path="/preferences" element={<PreferencesPage/>}/>
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppContext>
        </ColorsContext>
      </BrowserRouter>
    </Container>
  );
}