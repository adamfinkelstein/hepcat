import React, { useEffect, useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { useColors, useChangeColor, useDefaultColors, useTextColors, useChangeTextColors } from '../contexts/PreferencesContext';
import { SketchPresetColors } from 'react-color/lib/components/sketch/SketchPresetColors';
import { Col } from 'react-bootstrap';
import ColorsDisplay from './ColorsDisplay';

export default function ColorPreferences(){

  let colors = useColors()
  let changeColor = useChangeColor()
  let defaultColors = useDefaultColors()
  let textColors = useTextColors()
  let changeTextColors = useChangeTextColors()
  let [pickingFor, setPickingFor] = useState("reject")

  let handleChangeComplete = (type, color) => {
    let textBlack = color.hsv.v > 0.5 ? true : false; 
    changeTextColors(type, textBlack)
    changeColor(type, color.hex);
  };

    return (
        // Color Preferences
        <Container className="color-preferences-container">
            <h3>Color Preferences</h3>
            <Stack direction='horizontal'>
                <ColorsDisplay clickable setPickingFor={setPickingFor}/>
                <SketchPicker
                    disableAlpha
                    color={ colors[pickingFor] }
                    onChangeComplete={ (color) => handleChangeComplete(pickingFor, color) }
                    className="color-picker"
                />
            </Stack>
            <Container>
                <button onClick={() => defaultColors()}>Go Back to Default Colors</button>
            </Container>
        </Container>
    );

}
