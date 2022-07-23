import TextPreferences from '../components/TextPreferences'
import ColorPreferences from '../components/ColorPreferences'
import FavoritePreferences from '../components/FavoritePreferences'
import Container from 'react-bootstrap/Container'
import {useFlasher} from '../contexts/FlasherContext'
import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';

export default function PreferencesPage() {
    let flasher = useFlasher()
    let visible = flasher["visible"]
    let hideFlash = flasher["hideFlash"];
    let flashMessage = flasher["flashMessage"]

    return (
        <Container className='preferences-page'>
            <Container className='preferences-container'>
                <TextPreferences/>
                <hr className="horizontal-divider"/>
                <ColorPreferences/>
                <hr className="horizontal-divider"/>
                <Collapse in={visible["favorites"]}>
                    <div>
                        <Alert variant={flashMessage.type || 'info'} dismissible
                        onClose={hideFlash}>
                            {flashMessage.message}
                        </Alert>
                    </div>
                </Collapse>
                <FavoritePreferences/>
            </Container>
        </Container>
  
    );
}