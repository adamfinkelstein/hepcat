import TextPreferences from '../components/TextPreferences';
import ColorPreferences from '../components/ColorPreferences';
import FavoritePreferences from '../components/FavoritePreferences';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useFontInfo } from '../contexts/PreferencesContext';

export default function PreferencesPage() {
  const { currentFontStyle } = useFontInfo();
  return (
    <Container className="PreferencesPage mt-3">
      <div className={currentFontStyle}>
        <h1>Preferences</h1>
        <Stack direction="vertical" gap={2}>
          <TextPreferences />
          <hr className="horizontal-divider" />
          <ColorPreferences />
          <hr className="horizontal-divider" />
          <FavoritePreferences />
        </Stack>
      </div>
    </Container>
  );
}
