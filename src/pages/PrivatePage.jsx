import FavoritePreferences from '../components/FavoritePreferences';
import RevokeStickies from '../components/RevokeStickies';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { usePreferences } from '../contexts/PreferencesContext';

export default function PrivatePage() {
  const { fontPref } = usePreferences();
  return (
    <Container className="PrivatePage mt-3">
      <div className={fontPref}>
        <h1>Private Settings</h1>
        <Stack direction="vertical" gap={2}>
          <FavoritePreferences />
          <hr className="horizontal-divider" />
          <RevokeStickies />
        </Stack>
      </div>
    </Container>
  );
}
