import React, { useState } from 'react';

const controlledLogContext = React.createContext();

export default function ControlledLogContext({ children }) {
  const [showLogs, setShowLogs] = useState(
    Boolean(process.env.REACT_APP_SHOW_LOGS)
  );

  const controlledLog = (...output) => {
    if (showLogs) {
      console.log(...output);
    }
  };

  return (
    <controlledLogContext.Provider value={{ controlledLog, setShowLogs }}>
      {children}
    </controlledLogContext.Provider>
  );
}

export function useControlledLog() {
  return React.useContext(controlledLogContext);
}
