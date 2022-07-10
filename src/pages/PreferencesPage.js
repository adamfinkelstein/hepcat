import TextPreferences from '../components/TextPreferences'
import ColorPreferences from '../components/ColorPreferences'
import Container from 'react-bootstrap/Container'

export default function PreferencesPage() {
    return (
        <Container className='preferences-container'>
            <TextPreferences/>
            <ColorPreferences/>
        </Container>
    );
}