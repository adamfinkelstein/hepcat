import TextPreferences from '../components/TextPreferences'
import ColorPreferences from '../components/ColorPreferences'
import Container from 'react-bootstrap/Container'

export default function PreferencesPage() {
    return (
        <Container>
            <Container>
                <h3>Text Preferences</h3>
                <TextPreferences/>
            </Container>

            <Container>
                <h3>Color Preferences</h3>
                <ColorPreferences/>
            </Container>

        </Container>
    );
}