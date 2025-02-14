import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ChooseStatusDropdown from './ChooseStatusDropdown.js';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import {
  useColors,
  useChangeColor,
  useDefaultColors,
  useChangeTextColors,
} from '../contexts/PreferencesContext';
import ColorLegend from './ColorLegend';

export default function ColorPreferences() {
  const { controlledLog } = useControlledLog();
  const colors = useColors();
  const colorKeys = Object.keys(colors);
  const changeColor = useChangeColor();
  const { defaultColors, changeToDefaultColors } = useDefaultColors();
  const defaultColorVals = Object.values(defaultColors);
  const changeTextColors = useChangeTextColors();
  const [selectedColorKey, setSelectedColorKey] = useState('Ready');

  const { flash } = useFlasher();

  let handleChangeColor = (type, color) => {
    controlledLog(color);
    const colorLightness = color.hsl.l;
    const blackWhiteThresh = 0.65; // threshold between black or white text
    const textBlack = colorLightness > blackWhiteThresh;
    changeTextColors(type, textBlack);
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
          <Stack className="mt-2" direction="horizontal" gap={5}>
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
