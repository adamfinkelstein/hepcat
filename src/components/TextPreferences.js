import { DropdownButton, Dropdown } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { usePreferences } from '../contexts/PreferencesContext';

export default function TextPreferences() {
  const { fontSize, fontSizes, setFontSize } = usePreferences();

  return (
    <Container fluid className="TextPreferences mt-4">
      <h2>Text</h2>
      <Stack direction="horizontal">
        <span className="bigger-font">Choose font size:</span>
        <DropdownButton
          id="dropdown-item-button"
          title={fontSize}
          className="mx-3"
        >
          {Object.keys(fontSizes).map((fontSizeKey, index) => {
            return (
              <Dropdown.Item
                key={index}
                as="button"
                onClick={() => setFontSize(fontSizeKey)}
              >
                {fontSizeKey}
              </Dropdown.Item>
            );
          })}
        </DropdownButton>
      </Stack>
    </Container>
  );
}
