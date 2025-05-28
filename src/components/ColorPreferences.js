import { useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ColorLegend from './ColorLegend';
import GridDemo from './GridDemo';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { usePreferences } from '../contexts/PreferencesContext';

export default function ColorPreferences() {
  const { controlledLog } = useControlledLog();
  const { colors, changeColor, defaultColors, changeToDefaultColors } =
    usePreferences();
  const defaultColorVals = Object.values(defaultColors);
  const [selectedColorKey, setSelectedColorKey] = useState('Tabled');

  const { flash } = useFlasher();

  let handleChangeColor = (type, color) => {
    controlledLog('change color', type, color);
    changeColor(type, color.hex);
  };

  const handleDefaultColorButton = () => {
    changeToDefaultColors();
    flash('Reset to default colors.', 'success');
  };

  return (
    <Container fluid className="ColorPreferences mb-5">
      <Stack direction="horizontal" gap={5} className="mb-3">
        <h2>Colors</h2>
        <Button variant="secondary" onClick={handleDefaultColorButton}>
          Reset to Defaults
        </Button>
      </Stack>
      <Stack direction="horizontal" gap={5}>
        <ColorLegend
          selectedColorKey={selectedColorKey}
          setSelectedColorKey={setSelectedColorKey}
        />
        <SketchPicker
          disableAlpha
          color={colors[selectedColorKey]}
          onChangeComplete={(color) =>
            handleChangeColor(selectedColorKey, color)
          }
          className="color-picker"
          presetColors={defaultColorVals}
        />
        <GridDemo />
      </Stack>
    </Container>
  );
}
