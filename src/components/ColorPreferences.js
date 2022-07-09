import React, { useEffect, useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { useColors, useChangeColor, useDefaultColors } from '../contexts/ColorContext';
import { SketchPresetColors } from 'react-color/lib/components/sketch/SketchPresetColors';
import { Col } from 'react-bootstrap';
import ColorsDisplay from './ColorsDisplay';

export default function ColorPreferences(){

  let colors = useColors()
  console.log(colors);
  let changeColor = useChangeColor()
  let defaultColors = useDefaultColors()
  let [pickingFor, setPickingFor] = useState("reject")

  let handleChangeComplete = (type, color) => {
    switch(type) {
        case "reject":
            changeColor("reject", color.hex);
            break;
        case "conference":
            changeColor("conference", color.hex);
            break;
        case "journal":
            changeColor("journal", color.hex);
            break;
        case "tabled":
            changeColor("tabled", color.hex);
            break;
        case "untouched":
            changeColor("untouched", color.hex);
            break;
        case "current":
            changeColor("current", color.hex);
            break;
        default:
          // code block
      }
    };

    return (
        // Color Preferences
        <Container>
            <Stack direction='horizontal'>
                <ColorsDisplay clickable setPickingFor={setPickingFor}/>
                <SketchPicker
                    disableAlpha
                    color={ colors[pickingFor] }
                    onChangeComplete={ (color) => handleChangeComplete(pickingFor, color) }
                />
            </Stack>
            <button onClick={() => defaultColors()}>Go Back to Defaults</button>
        </Container>
    );

}
