// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState } from 'react';

const controlledLogContext = React.createContext();

export default function ControlledLogContext({ children }) {
  const [showLogs, setShowLogs] = useState(true);

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
