import React, { useState, useContext } from 'react';

const GUIFiltersContext = React.createContext();

export function useGUI() {
  return useContext(GUIFiltersContext);
}
export default function GUIContext({ children }) {
  const [textFilterBox, setTextFilterBox] = useState('');

  return (
    <GUIFiltersContext.Provider
      value={{
        textFilterBox: textFilterBox,
        setTextFilterBox: setTextFilterBox,
      }}
    >
      {children}
    </GUIFiltersContext.Provider>
  );
}
