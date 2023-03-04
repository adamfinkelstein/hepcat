//import { text } from '@fortawesome/fontawesome-svg-core'
import React, {useState, useContext, useEffect} from 'react'
// import { useAppGlobals } from '../contexts/AppContext';

const defaultColors = {
  "Unseen": "#F4F4F4", 
  "Tabled": "#E8F77D", 
  "Reject": "#F3A8C0", 
  "Conference": "#628BF0", 
  "Journal": "#288D0C", 
  "Current": "#000000"
}

const defaultTextColors = {
  "Unseen": true, 
  "Tabled": true, 
  "Reject": true, 
  "Conference": false, 
  "Journal": false, 
  "Current": false
}
                          
const fontSizes = {
  "Extra Small": 0.80,
  "Small": 0.90,
  "Medium": 1.0,
  "Large": 1.2,
  "Extra Large": 1.4
}


const baseFontSizes = {
  "font-size-1": 36,
  "font-size-2": 25,
  "font-size-3": 20,
  "font-size-4": 16
}

const ColorsContext = React.createContext()
const ChangeColorsContext = React.createContext()
const TextColorsContext = React.createContext()
const ChangeTextColorsContext = React.createContext()
const FontInfoContext = React.createContext()
const ChangeFontSizeContext = React.createContext()
const FavoritesContext = React.createContext()
const ChangeFavoritesContext = React.createContext()
const SplitWidthContext = React.createContext()
const ChangeSplitWidthContext = React.createContext()

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

export function useFavorites(){
  return useContext(FavoritesContext)
}

export function useChangeFavorites(){
  return useContext(ChangeFavoritesContext)
}

export function useSplitWidth(){
  return useContext(SplitWidthContext)
}

export function useChangeSplitWidth(){
  return useContext(ChangeSplitWidthContext)
}

export default function PreferencesContext({children}){
  const [colors, setColors] = useState(defaultColors)
  const [textColors, setTextColors] = useState(defaultTextColors)
  const [fontSize, setFontSize] = useState("Medium")
  // not sure if this is the best approach (avoiding overwriting of data on load with this variable)
  const [prefUpdated, setPrefUpdated] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [splitWidth, setSplitWidth] = useState([40, 60])

//  let controlledLog = useAppGlobals()["controlledLog"]

  useEffect(() => {
    const colorData = localStorage.getItem("colors")
    const textColorData = localStorage.getItem("textColors")
    const fontSizeData = localStorage.getItem("fontSize")
    const favoritesData = localStorage.getItem("favorites")
    const splitWidthData = localStorage.getItem("splitWidth")

    if(colorData){
        setColors(JSON.parse(colorData))
    }
    if(fontSizeData){
      setTextColors(JSON.parse(textColorData))
    }
    if(fontSizeData){
      setFontSize(JSON.parse(fontSizeData))
    }
    if(favoritesData){
      setFavorites(JSON.parse(favoritesData))
    }
    if(splitWidthData){
      setSplitWidth(JSON.parse(splitWidthData))
    }
    setPrefUpdated(true)
    }, [])

  useEffect(() => {
    let cssStyle = document.createElement('style');
    cssStyle.type = 'text/css';
    let multiplier = fontSizes[fontSize]
    Object.keys(baseFontSizes).forEach((fontType) => {
      const baseFontSize = baseFontSizes[fontType]
      const fontPX = baseFontSize*multiplier
      const fontSizeRule = document.createTextNode(`.${fontType}{font-size:${fontPX}px}`)
      cssStyle.appendChild(fontSizeRule);

      let fontSizeRuleMD = null;

      switch(fontType){
        case "font-size-1":
          fontSizeRuleMD = document.createTextNode(`.about-container h1{font-size:${fontPX}px}`)
          break;
        case "font-size-2":
          fontSizeRuleMD = document.createTextNode(`.about-container h3{font-size:${fontPX}px}`)
          cssStyle.appendChild(fontSizeRuleMD)
          break;
        case "font-size-3":
        default:
          fontSizeRuleMD = document.createTextNode(`.about-container li, .about-container p{font-size:${fontPX}px}`)
          break;
      }

      if(fontSizeRuleMD){
        cssStyle.appendChild(fontSizeRuleMD)
      }
    })

    document.getElementsByTagName("head")[0].appendChild(cssStyle);
  }, [fontSize])

  // XXX ??? This effect fires on every render!
  // Too often?
  useEffect(() => {
      if(prefUpdated){
          localStorage.setItem("colors", JSON.stringify(colors));
          localStorage.setItem("textColors", JSON.stringify(textColors));
          localStorage.setItem("fontSize", JSON.stringify(fontSize));
          localStorage.setItem("favorites", JSON.stringify(favorites));
          localStorage.setItem("splitWidth", JSON.stringify(splitWidth));
      }
      var cssStyle = document.createElement('style');
      cssStyle.type = 'text/css';
      Object.keys(colors).forEach((colorKey) => {
          var prefRule = document.createTextNode(`.${colorKey}{background:${colors[colorKey]};
          color:${textColors[colorKey] ? "#000" : "#fff"}}`);
          cssStyle.appendChild(prefRule);
      })

      // controlledLog(cssStyle)
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
            <DefaultColorsContext.Provider value={{"defaultColors": defaultColors, "changeToDefaultColors": changeToDefaultColors}}>
              <TextColorsContext.Provider value={textColors}>
                <ChangeTextColorsContext.Provider value={changeTextColors}>
                  <FontInfoContext.Provider value={{"currentFontSize": fontSize, "fontSizes": fontSizes}}>
                    <ChangeFontSizeContext.Provider value={setFontSize}>
                      <FavoritesContext.Provider value={favorites}>
                        <ChangeFavoritesContext.Provider value={setFavorites}>
                          <SplitWidthContext.Provider value={splitWidth}>
                            <ChangeSplitWidthContext.Provider value={setSplitWidth}>
                              {children}
                            </ChangeSplitWidthContext.Provider>
                          </SplitWidthContext.Provider>
                        </ChangeFavoritesContext.Provider>
                      </FavoritesContext.Provider>
                    </ChangeFontSizeContext.Provider>
                  </FontInfoContext.Provider>
                </ChangeTextColorsContext.Provider>
              </TextColorsContext.Provider>
            </DefaultColorsContext.Provider>
        </ChangeColorsContext.Provider>
    </ColorsContext.Provider>
  )
}