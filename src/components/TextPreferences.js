import { DropdownButton, Dropdown } from 'react-bootstrap';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useChangeFontSize, useFontInfo } from '../contexts/PreferencesContext';

export default function TextPreferences() {
  let fontInfo = useFontInfo();
  let changeFontSize = useChangeFontSize();

  return (
    <Container>
      <span className="font-size-2">Text</span>
      <Stack direction="horizontal">
        <span className="font-size-3">Choose font size</span>
        <DropdownButton
          id="dropdown-item-button"
          title={fontInfo['currentFontSize']}
          className="font-size-dropdown"
        >
          {Object.keys(fontInfo['fontSizes']).map((fontSizeKey, index) => {
            return (
              <Dropdown.Item
                key={index}
                as="button"
                onClick={() => changeFontSize(fontSizeKey)}
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
