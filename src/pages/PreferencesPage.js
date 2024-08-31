import TextPreferences from '../components/TextPreferences';
import ColorPreferences from '../components/ColorPreferences';
import FavoritePreferences from '../components/FavoritePreferences';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';

export default function PreferencesPage() {
  return (
    <Container className="PreferencesPage mt-4">
      <span className="font-size-1">Preferences</span>
      <Stack direction="vertical" gap={2}>
        <TextPreferences />
        <hr className="horizontal-divider" />
        <ColorPreferences />
        <hr className="horizontal-divider" />
        <FavoritePreferences />
      </Stack>
    </Container>
  );
}
