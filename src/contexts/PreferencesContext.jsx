// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useCallback, useEffect } from 'react';
import { useCount } from './CountContext';
import { useStorage } from './StorageContext';

const defaultColors = {
  Ready: '#F4F4F4',
  'Tabled-Discuss': '#FFC65E',
  Tabled: '#E8F77D',
  Reject: '#F3A8C0',
  Conference: '#628BF0',
  Journal: '#288D0C',
  Current: '#000000',
  Conflict: '#DD1111',
};

const fontSizes = {
  Micro: 'size-3XS',
  Tiny: 'size-2XS',
  Small: 'size-XS',
  Smallish: 'size-S',
  Medium: 'size-M',
  Largish: 'size-L',
  Large: 'size-XL',
  Huge: 'size-2XL',
  Gigantic: 'size-3XL',
};

const fontScales = {
  'size-3XS': 60,
  'size-2XS': 68,
  'size-XS': 77,
  'size-S': 88,
  'size-M': 100,
  'size-L': 108,
  'size-XL': 117,
  'size-2XL': 126,
  'size-3XL': 136,
};

// Function to determine if text should be black (or white)
// over a given background color. Check luminance.
const textShouldBeBlackOverColor = (hexColor) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65;
};

const appendCSSRule = (cssText, styleNode) => {
  const cssRule = document.createTextNode(cssText);
  styleNode.appendChild(cssRule);
};

const appendColorRule = (colorKey, bgColor, styleNode) => {
  const textBlack = textShouldBeBlackOverColor(bgColor);
  const textColor = textBlack ? '#000' : '#fff';
  const textCSS = `.${colorKey} {
    background: ${bgColor};
    color: ${textColor};
  }`;
  appendCSSRule(textCSS, styleNode);
};

const appendFontRule = (fontKey, fontScale, styleNode) => {
  const fontCSS = `.${fontKey} {
    zoom: ${fontScale}%;
  }`;
  appendCSSRule(fontCSS, styleNode);
};

const PREF_STORAGE_KEY = 'preferences';

const preferencesContext = React.createContext();

export function usePreferences() {
  return React.useContext(preferencesContext);
}

export default function PreferencesContext({ children }) {
  const { colorKeys } = useCount();
  const { getUserLocalStorageItem, setUserLocalStorageItem } = useStorage();
  const [isInitialized, setIsInitialized] = useState(false);
  const [colors, setColors] = useState(defaultColors);
  const [fontSize, setFontSize] = useState('Medium');
  const [favorites, setFavorites] = useState([]);
  const [splitWidth, setSplitWidth] = useState([40, 60]);
  const [showAbstract, setShowAbstract] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showStars, setShowStars] = useState(true);

  const writePrefsToLocalStorage = useCallback(() => {
    const prefs = {
      col: colors,
      fon: fontSize,
      fav: favorites,
      spl: splitWidth,
      abs: showAbstract,
      con: showConflicts,
      sta: showStars,
    };
    setUserLocalStorageItem(PREF_STORAGE_KEY, prefs);
  }, [
    colors,
    fontSize,
    favorites,
    splitWidth,
    showAbstract,
    showConflicts,
    showStars,
    setUserLocalStorageItem,
  ]);

  const readPrefsFromLocalStorage = useCallback(() => {
    const prefs = getUserLocalStorageItem(PREF_STORAGE_KEY);
    if (prefs) {
      const { col, fon, fav, spl, abs, con, sta } = prefs;
      // this pattern allows for new preferences to be added:
      if (col !== undefined) setColors(col);
      if (fon !== undefined) setFontSize(fon);
      if (fav !== undefined) setFavorites(fav);
      if (spl !== undefined) setSplitWidth(spl);
      if (abs !== undefined) setShowAbstract(abs);
      if (con !== undefined) setShowConflicts(con);
      if (sta !== undefined) setShowStars(sta);
    }
  }, [getUserLocalStorageItem]);

  // Read preferences on mount
  useEffect(() => {
    readPrefsFromLocalStorage();
    setIsInitialized(true);
  }, [readPrefsFromLocalStorage]);

  // Only save preferences when they change, and initialization is complete
  useEffect(() => {
    if (isInitialized) {
      writePrefsToLocalStorage();
    }
  }, [isInitialized, writePrefsToLocalStorage]);

  useEffect(() => {
    const cssStyle = document.createElement('style');
    Object.entries(colors).forEach(([colorKey, bgColor]) => {
      appendColorRule(colorKey, bgColor, cssStyle);
    });
    Object.entries(fontScales).forEach(([fontKey, fontScale]) => {
      appendFontRule(fontKey, fontScale, cssStyle);
    });
    document.getElementsByTagName('head')[0].appendChild(cssStyle);
    // clean up
    return () => {
      if (cssStyle.parentNode) {
        cssStyle.parentNode.removeChild(cssStyle);
      }
    };
  }, [colors, colorKeys]);

  function changeToDefaultColors() {
    setColors(defaultColors);
  }

  function changeColor(colorType, newColor) {
    setColors({
      ...colors,
      [colorType]: newColor,
    });
  }

  return (
    <preferencesContext.Provider
      value={{
        // Colors
        colors,
        changeColor,
        defaultColors,
        changeToDefaultColors,

        // Font Info
        fontSizes,
        fontSize,
        setFontSize,
        fontPref: fontSizes[fontSize],

        // Favorites
        favorites,
        setFavorites,

        // GUI settings
        splitWidth,
        setSplitWidth,
        showAbstract,
        setShowAbstract,
        showConflicts,
        setShowConflicts,
        showStars,
        setShowStars,
      }}
    >
      {children}
    </preferencesContext.Provider>
  );
}
