import React, { useState, useContext, useEffect } from 'react';

const defaultColors = {
  Unseen: '#F4F4F4',
  Tabled: '#E8F77D',
  Reject: '#F3A8C0',
  Conference: '#628BF0',
  Journal: '#288D0C',
  Current: '#000000',
};

const defaultTextBlackOrWhite = {
  Unseen: true,
  Tabled: true,
  Reject: true,
  Conference: false,
  Journal: false,
  Current: false,
};

const fontSizes = {
  'Extra Small': 0.8,
  Small: 0.9,
  Medium: 1.0,
  Large: 1.2,
  'Extra Large': 1.4,
};

const baseFontSizes = {
  'font-size-1': 36,
  'font-size-2': 25,
  'font-size-3': 20,
  'font-size-4': 16,
};

const ColorsContext = React.createContext();
const ChangeColorsContext = React.createContext();
const TextColorsContext = React.createContext();
const ChangeTextColorsContext = React.createContext();
const FontInfoContext = React.createContext();
const ChangeFontSizeContext = React.createContext();
const FavoritesContext = React.createContext();
const ChangeFavoritesContext = React.createContext();
const SplitWidthContext = React.createContext();
const ChangeSplitWidthContext = React.createContext();

const DefaultColorsContext = React.createContext();

export function useColors() {
  return useContext(ColorsContext);
}

export function useChangeColor() {
  return useContext(ChangeColorsContext);
}

export function useTextColors() {
  return useContext(TextColorsContext);
}

export function useChangeTextColors() {
  return useContext(ChangeTextColorsContext);
}

export function useDefaultColors() {
  return useContext(DefaultColorsContext);
}

export function useFontInfo() {
  return useContext(FontInfoContext);
}

export function useChangeFontSize() {
  return useContext(ChangeFontSizeContext);
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

export function useChangeFavorites() {
  return useContext(ChangeFavoritesContext);
}

export function useSplitWidth() {
  return useContext(SplitWidthContext);
}

export function useChangeSplitWidth() {
  return useContext(ChangeSplitWidthContext);
}

export default function PreferencesContext({ children }) {
  const [colors, setColors] = useState(defaultColors);
  const [textBlackOrWhite, setTextBlackOrWhite] = useState(
    defaultTextBlackOrWhite,
  );
  const [fontSize, setFontSize] = useState('Medium');
  const [favorites, setFavorites] = useState([]);
  const [splitWidth, setSplitWidth] = useState([40, 60]);
  // not sure if this is the best approach (avoiding overwriting of data on load with this variable)
  const [prefUpdated, setPrefUpdated] = useState(false);

  const writePrefsToLocalStorage = () => {
    localStorage.setItem('colors', JSON.stringify(colors));
    localStorage.setItem('textColors', JSON.stringify(textBlackOrWhite));
    localStorage.setItem('fontSize', JSON.stringify(fontSize));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    localStorage.setItem('splitWidth', JSON.stringify(splitWidth));
  };

  const readPrefsFromLocalStorage = () => {
    const colorData = localStorage.getItem('colors');
    const textColorData = localStorage.getItem('textColors');
    const fontSizeData = localStorage.getItem('fontSize');
    const favoritesData = localStorage.getItem('favorites');
    const splitWidthData = localStorage.getItem('splitWidth');

    if (colorData) {
      setColors(JSON.parse(colorData));
    }
    if (fontSizeData) {
      setTextBlackOrWhite(JSON.parse(textColorData));
    }
    if (fontSizeData) {
      setFontSize(JSON.parse(fontSizeData));
    }
    if (favoritesData) {
      setFavorites(JSON.parse(favoritesData));
    }
    if (splitWidthData) {
      setSplitWidth(JSON.parse(splitWidthData));
    }
  };

  // Empty dependency array means this effect will only run once.
  useEffect(() => {
    readPrefsFromLocalStorage();
    setPrefUpdated(true);
  }, []);

  // No dependency array means this effect will run on every render.
  // Is that too often??? Maybe.
  useEffect(() => {
    if (prefUpdated) {
      writePrefsToLocalStorage();
    }
  });

  // No dependency array means this effect will run on every render.
  // Is that too often??? Maybe.
  useEffect(() => {
    const cssStyle = document.createElement('style');
    const colorKeys = Object.keys(colors);
    colorKeys.forEach((colorKey) => {
      const textBG = colors[colorKey];
      const textColor = textBlackOrWhite[colorKey] ? '#000' : '#fff';
      const textCSS =
        '.' + colorKey + '{background:' + textBG + ';color:' + textColor + '}';
      const prefRule = document.createTextNode(textCSS);
      cssStyle.appendChild(prefRule);
    });

    // controlledLog(cssStyle)
    document.getElementsByTagName('head')[0].appendChild(cssStyle);
  });

  // Dependency array means this effect will run whenever the fontSize changes.
  useEffect(() => {
    const cssStyle = document.createElement('style');
    const multiplier = fontSizes[fontSize];
    const fontKeys = Object.keys(baseFontSizes);
    fontKeys.forEach((fontType) => {
      const baseFontSize = baseFontSizes[fontType];
      const fontPX = baseFontSize * multiplier;
      const textNode = `.${fontType}{font-size:${fontPX}px}`;
      const fontSizeRule = document.createTextNode(textNode);
      cssStyle.appendChild(fontSizeRule);
    });
    document.getElementsByTagName('head')[0].appendChild(cssStyle);
  }, [fontSize]);

  function changeToDefaultColors() {
    setColors(defaultColors);
    setTextBlackOrWhite(defaultTextBlackOrWhite);
  }

  function changeColor(colorType, newColor) {
    let newColors = { ...colors };
    newColors[colorType] = newColor;
    setColors(newColors);
  }

  function changeTextColors(textColorType, newTextColor) {
    let newTextColors = { ...textBlackOrWhite };
    newTextColors[textColorType] = newTextColor;
    setTextBlackOrWhite(newTextColors);
  }

  return (
    <ColorsContext.Provider value={colors}>
      <ChangeColorsContext.Provider value={changeColor}>
        <DefaultColorsContext.Provider
          value={{
            defaultColors: defaultColors,
            changeToDefaultColors: changeToDefaultColors,
          }}
        >
          <TextColorsContext.Provider value={textBlackOrWhite}>
            <ChangeTextColorsContext.Provider value={changeTextColors}>
              <FontInfoContext.Provider
                value={{ currentFontSize: fontSize, fontSizes: fontSizes }}
              >
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
  );
}
