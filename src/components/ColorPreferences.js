import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { useColors, useChangeColor, useDefaultColors, useChangeTextColors } from '../contexts/PreferencesContext';
// import { SketchPresetColors } from 'react-color/lib/components/sketch/SketchPresetColors';
// import { Col } from 'react-bootstrap';
import ColorsDisplay from './ColorsDisplay';
import Button from 'react-bootstrap/Button'
import { useAppGlobals } from '../contexts/AppContext';
import {useFlasher} from '../contexts/FlasherContext'

export default function ColorPreferences(){

  let colors = useColors()
  let changeColor = useChangeColor()
  let defaultColors = Object.values(useDefaultColors()["defaultColors"])
  let changeToDefaultColors = useDefaultColors()["changeToDefaultColors"]
  // let textColors = useTextColors()
  let changeTextColors = useChangeTextColors()
  let [pickingFor, setPickingFor] = useState("Unseen")

  let controlledLog = useAppGlobals()["controlledLog"]

  let flasher = useFlasher()
  let flash = flasher["flash"]

  let handleChangeComplete = (type, color) => {
        controlledLog(color)
        const blackWhiteThresh = 0.7; // threshold between black or white text
        const textBlack = color.hsl.l > blackWhiteThresh ? true : false; 
        changeTextColors(type, textBlack)
        changeColor(type, color.hex);
    };

    return (
        // Color Preferences
        <Container className="color-preferences-container">
            <span className="font-size-2">Color</span>
            <Stack direction='horizontal'>
                <ColorsDisplay clickable setPickingFor={setPickingFor} pickingFor={pickingFor}/>
                <SketchPicker
                    disableAlpha
                    color={ colors[pickingFor] }
                    onChangeComplete={ (color) => handleChangeComplete(pickingFor, color) }
                    className="color-picker"
                    presetColors={defaultColors}
                />
            </Stack>
            <Container>
                <Button variant="secondary" onClick={() => {
                    flash("Changed to default colors.", "success", "colors")
                    changeToDefaultColors()
                }}>Go Back to Default Colors</Button>
            </Container>
        </Container>
    );

}
