import React, { useState, useEffect } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';

const filterContext = React.createContext();

export default function FilterContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { socket, socketEmit } = useSocketIO();
  const [statusCheckbox, setStatusCheckbox] = useState([]);
  const [onlyCheckbox, setOnlyCheckbox] = useState([]);
  const [scoreSelection, setScoreSelection] = useState('In Range'); // default matches SetQueue.js
  const [lowRange, setLowRange] = useState(-9.0);
  const [highRange, setHighRange] = useState(9.0);
  const [allGuiFilterNames, setAllGuiFilterNames] = useState([]);
  const [allTextFilterNames, setAllTextFilterNames] = useState([]);
  const [guiFilterName, setGuiFilterName] = useState('');
  const [textFilterName, setTextFilterName] = useState('');
  const [textFilterBox, setTextFilterBox] = useState('');

  useEffect(() => {
    const receiveOneFilter = (filter) => {
      controlledLog('receiveOneFilter:', filter);
      if (typeof filter === 'string') {
        // this is a text filter
        setTextFilterBox(filter);
      } else {
        // this is a GUI filter
        setOnlyCheckbox(filter.only);
        setStatusCheckbox(filter.statuses);
        setScoreSelection('In Range');
        setLowRange(filter.lowRange);
        setHighRange(filter.highRange);
      }
    };

    const receiveFilterNames = (filters) => {
      setAllGuiFilterNames(filters.gui);
      setAllTextFilterNames(filters.text);
    };

    if (socket && 'on' in socket) {
      controlledLog('register socket handlers for filter context');
      socket.on('server_send_one_filter', receiveOneFilter);
      socket.on('server_send_filter_names', receiveFilterNames);
    }

    // return from useEffect is function that does cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers');
        socket.off('server_send_one_filter', receiveOneFilter);
        socket.off('server_send_filter_names', receiveFilterNames);
      }
    };
  }, [socket, controlledLog, socketEmit]);

  return (
    <filterContext.Provider
      value={{
        statusCheckbox,
        setStatusCheckbox,
        onlyCheckbox,
        setOnlyCheckbox,
        scoreSelection,
        setScoreSelection,
        lowRange,
        setLowRange,
        highRange,
        setHighRange,
        allGuiFilterNames,
        setAllGuiFilterNames,
        allTextFilterNames,
        setAllTextFilterNames,
        guiFilterName,
        setGuiFilterName,
        textFilterName,
        setTextFilterName,
        textFilterBox,
        setTextFilterBox,
      }}
    >
      {children}
    </filterContext.Provider>
  );
}

export function useFilterContext() {
  return React.useContext(filterContext);
}
