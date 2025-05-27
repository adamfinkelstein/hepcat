import React, { useState, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';

const filterContext = React.createContext();

export default function FilterContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { registerIoHandlers } = useSocketIO();
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
  const [textFilterInput, setTextFilterInput] = useState('');

  const receiveOneFilter = useCallback(
    (filter) => {
      controlledLog('receiveOneFilter:', filter);
      if (typeof filter === 'string') {
        // this is a text filter
        setTextFilterInput(filter);
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
    },
    [controlledLog]
  );

  const receiveFilterNames = useCallback(
    (filters) => {
      setAllGuiFilterNames(filters.gui);
      setAllTextFilterNames(filters.text);
    },
    [setAllGuiFilterNames, setAllTextFilterNames]
  );

  const getHandlers = useCallback(() => {
    return {
      server_load_filter: receiveOneFilter,
      server_send_filter_names: receiveFilterNames,
    };
  }, [receiveOneFilter, receiveFilterNames]);

  useEffect(() => {
    const context = 'FilterContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

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
        textFilterInput,
        setTextFilterInput,
      }}
    >
      {children}
    </filterContext.Provider>
  );
}

export function useFilterContext() {
  return React.useContext(filterContext);
}
