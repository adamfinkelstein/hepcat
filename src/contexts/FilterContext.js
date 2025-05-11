import React, { useState, useEffect } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';

const filterContext = React.createContext();

export default function FilterContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { socket, socketEmit } = useSocketIO();
  const [statusCheckbox, setStatusCheckbox] = useState([]);
  const [onlyCheckbox, setOnlyCheckbox] = useState([]);
  const [aboveScore, setAboveScore] = useState(-9.0);
  const [belowScore, setBelowScore] = useState(9.0);
  const [useAboveScore, setUseAboveScore] = useState(false);
  const [useBelowScore, setUseBelowScore] = useState(false);
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
        const newAbove = filter.useAboveScore ? filter.aboveScore : -9.0;
        const newBelow = filter.useBelowScore ? filter.belowScore : 9.0;
        setOnlyCheckbox(filter.only);
        setStatusCheckbox(filter.statuses);
        setUseAboveScore(filter.useAboveScore);
        setUseBelowScore(filter.useBelowScore);
        setAboveScore(newAbove);
        setBelowScore(newBelow);
      }
    };

    const receiveFilterNames = (filters) => {
      setAllGuiFilterNames(filters.gui);
      setAllTextFilterNames(filters.text);
    };

    if (socket && 'on' in socket) {
      controlledLog('register socket handlers in FilterContext');
      socket.on('server_load_filter', receiveOneFilter);
      socket.on('server_send_filter_names', receiveFilterNames);
    }

    // return from useEffect is function that does cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers in FilterContext');
        socket.off('server_load_filter', receiveOneFilter);
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
        aboveScore,
        setAboveScore,
        belowScore,
        setBelowScore,
        useAboveScore,
        setUseAboveScore,
        useBelowScore,
        setUseBelowScore,
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
