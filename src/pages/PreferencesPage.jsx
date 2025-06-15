// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import TextPreferences from '../components/TextPreferences';
import ColorPreferences from '../components/ColorPreferences';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { usePreferences } from '../contexts/PreferencesContext';

export default function PreferencesPage() {
  const { fontPref } = usePreferences();
  return (
    <Container className="PreferencesPage mt-3">
      <div className={fontPref}>
        <h1>Preferences</h1>
        <Stack direction="vertical" gap={2}>
          <TextPreferences />
          <hr className="horizontal-divider" />
          <ColorPreferences />
        </Stack>
      </div>
    </Container>
  );
}
