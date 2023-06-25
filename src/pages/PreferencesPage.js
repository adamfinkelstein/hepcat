import TextPreferences from '../components/TextPreferences'
import ColorPreferences from '../components/ColorPreferences'
import FavoritePreferences from '../components/FavoritePreferences'
import Container from 'react-bootstrap/Container'
//import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'

export default function PreferencesPage() {
    return (
        <Container className='titled-page'>
            <span className='font-size-1'>Preferences</span>
            <Container className='preferences-container'>
                <TextPreferences/>
                <hr className="horizontal-divider"/>
                <Flasher type="colors"/>
                <ColorPreferences/>
                <hr className="horizontal-divider"/>
                <Flasher type="favorites"/>
                <FavoritePreferences/>
            </Container>
        </Container>
  
    );
}