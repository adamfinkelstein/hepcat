import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ChooseStatusDropdown from './ChooseStatusDropdown.js';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useCount } from '../contexts/CountContext';
import { usePreferences } from '../contexts/PreferencesContext';
import ColorLegend from './ColorLegend';

export default function ColorPreferences() {
  const { controlledLog } = useControlledLog();
  const { colors, changeColor, defaultColors, changeToDefaultColors } =
    usePreferences();
  const { colorKeys } = useCount();
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
    <Container fluid className="ColorPreferences">
      <h2>Modify Colors</h2>
      <Stack direction="horizontal" gap={5}>
        <SketchPicker
          disableAlpha
          color={colors[selectedColorKey]}
          onChangeComplete={(color) =>
            handleChangeColor(selectedColorKey, color)
          }
          className="color-picker"
          presetColors={defaultColorVals}
        />
        <Stack direction="vertical" gap={2}>
          <Stack direction="horizontal" gap={2}>
            <div className="bigger-font">Modify:</div>
            <ChooseStatusDropdown
              choiceList={colorKeys}
              currentChoice={selectedColorKey}
              setValue={setSelectedColorKey}
            />
            <div />
          </Stack>
          <ColorLegend header="Color Codes" />
          <Stack className="mt-2 mb-5" direction="horizontal" gap={5}>
            <Button variant="secondary" onClick={handleDefaultColorButton}>
              Reset to Defaults
            </Button>
            <div />
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
