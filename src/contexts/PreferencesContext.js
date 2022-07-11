import { text } from '@fortawesome/fontawesome-svg-core'
import React, {useState, useContext, useEffect} from 'react'

const defaultColors = {"reject": "#f00", "conference": "#00f", "journal": "#0f0", "tabled": "#eee", 
                      "untouched": "#ef0", "current": "#0af"}
const defaultTextColors = {"reject": true, "conference": true, "journal": true, "tabled": true, 
                          "untouched": true, "current": true}
                          
const fontSizes = {
                    "Extra Small": 0.70,
                    "Small": 0.85,
                    "Medium": 1.0,
                    "Large": 1.15,
                    "Extra Large": 1.30
                  }

const ColorsContext = React.createContext()
const ChangeColorsContext = React.createContext()
const TextColorsContext = React.createContext()
const ChangeTextColorsContext = React.createContext()
const FontInfoContext = React.createContext()
const ChangeFontSizeContext = React.createContext()

const DefaultColorsContext = React.createContext()

export function useColors(){
  return useContext(ColorsContext)
}

export function useChangeColor(){
    return useContext(ChangeColorsContext)
}

export function useTextColors(){
  return useContext(TextColorsContext)
}

export function useChangeTextColors(){
    return useContext(ChangeTextColorsContext)
}

export function useDefaultColors(){
    return useContext(DefaultColorsContext)
}

export function useFontInfo(){
  return useContext(FontInfoContext)
}

export function useChangeFontSize(){
  return useContext(ChangeFontSizeContext)
}

export default function PreferencesContext({children}){
  const [colors, setColors] = useState(defaultColors)
  const [textColors, setTextColors] = useState(defaultTextColors)
  const [fontSize, setFontSize] = useState("Medium")
  // not sure if this is the best approach (avoiding overwriting of data on load with this variable)
  const [prefUpdated, setPrefUpdated] = useState(false)

  useEffect(() => {
    const colorData = localStorage.getItem("colors")
    const textColorData = localStorage.getItem("textColors")
    const fontSizeData = localStorage.getItem("fontSize")

    if(colorData){
        setColors(JSON.parse(colorData))
    }
    if(fontSizeData){
      setTextColors(JSON.parse(textColorData))
    }
    if(fontSizeData){
      setFontSize(JSON.parse(fontSizeData))
    }
    setPrefUpdated(true)
    }, [])

  useEffect(() => {
      if(prefUpdated){
          localStorage.setItem("colors", JSON.stringify(colors));
          localStorage.setItem("textColors", JSON.stringify(textColors));
          localStorage.setItem("fontSize", JSON.stringify(fontSize));
      }
      var cssStyle = document.createElement('style');
      cssStyle.type = 'text/css';
      Object.keys(colors).forEach((colorKey) => {
          var prefRule = document.createTextNode(`.${colorKey}{background:${colors[colorKey]};
          color:${textColors[colorKey] ? "#000" : "#fff"}}`);
          cssStyle.appendChild(prefRule);
      })
      var fontSizeRule = document.createTextNode(`.custom-font-size{font-size:${100*fontSizes[fontSize]}%}`)
      cssStyle.appendChild(fontSizeRule);
      console.log(cssStyle)
      document.getElementsByTagName("head")[0].appendChild(cssStyle);
  });


  function changeToDefaultColors(){
      setColors(defaultColors)
      setTextColors(defaultTextColors)
  }
 
  function changeColor(colorType, newColor){
    let newColors = {...colors}
    newColors[colorType] = newColor
    setColors(newColors);
  }

  function changeTextColors(textColorType, newTextColor){
    let newTextColors = {...textColors}
    newTextColors[textColorType] = newTextColor
    setTextColors(newTextColors);
  }

  return(
    <ColorsContext.Provider value={colors}>
        <ChangeColorsContext.Provider value={changeColor}>
            <DefaultColorsContext.Provider value={changeToDefaultColors}>
              <TextColorsContext.Provider value={textColors}>
                <ChangeTextColorsContext.Provider value={changeTextColors}>
                  <FontInfoContext.Provider value={{"currentFontSize": fontSize, "fontSizes": fontSizes}}>
                    <ChangeFontSizeContext.Provider value={setFontSize}>
                      {children}
                    </ChangeFontSizeContext.Provider>
                  </FontInfoContext.Provider>
                </ChangeTextColorsContext.Provider>
              </TextColorsContext.Provider>
            </DefaultColorsContext.Provider>
        </ChangeColorsContext.Provider>
    </ColorsContext.Provider>
  )
}