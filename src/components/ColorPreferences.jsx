// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ColorLegend from './ColorLegend';
import GridDemo from './GridDemo';
import { useFlasher } from '../contexts/FlasherContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useControlledLog } from '../contexts/ControlledLogContext';

export default function ColorPreferences() {
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { colors, changeColor, changeToDefaultColors } = usePreferences();
  const [selectedColorKey, setSelectedColorKey] = useState('Ready');
  const logColorChanges = false;

  let handleChangeColor = (type, color) => {
    if (logColorChanges) controlledLog('change color', type, color);
    changeColor(type, color);
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
        <HexColorPicker
          color={colors[selectedColorKey]}
          onChange={(color) => handleChangeColor(selectedColorKey, color)}
          className="color-picker"
        />
        <GridDemo />
      </Stack>
    </Container>
  );
}
