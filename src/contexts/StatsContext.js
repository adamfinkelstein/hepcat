import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';

const statsContext = React.createContext();

export default function StatsContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { socket, socketEmit } = useSocketIO();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const receiveStats = (data) => {
      const now = Date.now();
      const fmtNow = moment.utc(now).local().format('ddd h:mm:ss');
      data.when = ' — updated ' + fmtNow;
      controlledLog('receiveStats:', data);
      setStats(data);
    };

    if (socket && 'on' in socket) {
      controlledLog('register socket handlers for stats context');
      socket.on('server_send_stats', receiveStats);
    }

    // return from useEffect is function that does cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers for stats context');
        socket.off('server_send_stats', receiveStats);
      }
    };
  }, [socket, controlledLog, socketEmit]);

  return (
    <statsContext.Provider
      value={{
        stats,
      }}
    >
      {children}
    </statsContext.Provider>
  );
}

export function useStatsContext() {
  return React.useContext(statsContext);
}
