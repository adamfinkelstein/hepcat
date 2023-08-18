import React from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext.js';

const socketIOContext = React.createContext();

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = React.useState(null);
  const { controlledLog } = useControlledLog();

  React.useEffect(() => {
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const s = socketIOClient(endpt);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const socketEmit = React.useCallback(
    (message, data) => {
      if (!socket || !socket.emit) {
        controlledLog('socket does not exist, message not sent.');
        return;
      }
      controlledLog('socketEmit: ' + message);
      if (data) {
        socket.emit(message, data);
      } else {
        socket.emit(message);
      }
    },
    [socket, controlledLog],
  );

  return (
    <socketIOContext.Provider value={{ socket, socketEmit }}>
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}
