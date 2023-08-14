import React, { useState, useContext } from 'react';

const GUIFiltersContext = React.createContext();

export function useGUI() {
  return useContext(GUIFiltersContext);
}
export default function GUIContext({ children }) {
  const [queueExplicitList, setQueueExplicitList] = useState('');

  return (
    <GUIFiltersContext.Provider
      value={{
        queueExplicitList: queueExplicitList,
        setQueueExplicitList: setQueueExplicitList,
      }}
    >
      {children}
    </GUIFiltersContext.Provider>
  );
}
