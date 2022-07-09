import React, {useState, useContext, useEffect} from 'react'

const defaultColors = {"reject": "#f00", "conference": "#00f", "journal": "#0f0", "tabled": "#eee", 
"untouched": "#ef0", "current": "#0af"}

const ColorsContext = React.createContext()
const ChangeColorsContext = React.createContext()
const DefaultColorsContext = React.createContext()

export function useColors(){
  return useContext(ColorsContext)
}

export function useChangeColor(){
    return useContext(ChangeColorsContext)
}

export function useDefaultColors(){
    return useContext(DefaultColorsContext)
}

export default function ColorContext({children}){
  const [colors, setColors] = useState(defaultColors)
  const [colorsUpdated, setColorsUpdated] = useState(false)

  useEffect(() => {
    const data = localStorage.getItem("colors")
    if(data){
        setColors(JSON.parse(data))
        setColorsUpdated(true)
    }
    }, [])

    useEffect(() => {
        if(colorsUpdated){
            localStorage.setItem("colors", JSON.stringify(colors));
        }
        var cssStyle = document.createElement('style');
        cssStyle.type = 'text/css';
        Object.keys(colors).forEach((colorKey) => {
            var rule = document.createTextNode(`.${colorKey}{background:${colors[colorKey]}}`);
            cssStyle.appendChild(rule);
        })
        document.getElementsByTagName("head")[0].appendChild(cssStyle);
    });


  function changeToDefaultColors(){
      setColors(defaultColors)
  }
 
  function changeColor(colorType, newColor){
    let newColors = {...colors}
    newColors[colorType] = newColor
    console.log(newColors)
    setColors(newColors);
  }

  return(
    <ColorsContext.Provider value={colors}>
        <ChangeColorsContext.Provider value={changeColor}>
            <DefaultColorsContext.Provider value={changeToDefaultColors}>
                {children}
            </DefaultColorsContext.Provider>
        </ChangeColorsContext.Provider>
    </ColorsContext.Provider>
  )
}