import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import {
  useColors,
  useChangeColor,
  useDefaultColors,
  useChangeTextColors,
} from '../contexts/PreferencesContext';
import ColorsDisplay from './ColorsDisplay';

export default function ColorPreferences() {
  const { controlledLog } = useControlledLog();
  const colors = useColors();
  const changeColor = useChangeColor();
  const { defaultColors, changeToDefaultColors } = useDefaultColors();
  const defaultColorVals = Object.values(defaultColors);
  const changeTextColors = useChangeTextColors();
  const [selectedColorKey, setSelectedColorKey] = useState('Unseen');

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
      <span className="font-size-2">Color</span>
      <Stack direction="horizontal" gap={5}>
        <ColorsDisplay
          clickable
          setSelectedColorKey={setSelectedColorKey}
          selectedColorKey={selectedColorKey}
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
      </Stack>
      <Container fluid>
        <Button variant="secondary" onClick={handleDefaultColorButton}>
          Reset Default Colors
        </Button>
      </Container>
    </Container>
  );
}
