import React from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';

const socketIOContext = React.createContext();

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = React.useState(null);
  const [auth, setAuth] = React.useState(null);
  const { controlledLog } = useControlledLog();

  const socketLogin = React.useCallback((email, password) => {
    setAuth({ email, password });
  }, []);

  const socketLogout = React.useCallback(() => {
    setAuth(null);
    setSocket(null);
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

  React.useEffect(() => {
    if (!auth) {
      // the user did not log in yet
      return;
    }
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const s = socketIOClient(endpt, { auth });
    setSocket(s);

    s.on('disconnect', () => {
      socketLogout();
    });

    return () => {
      s.disconnect();
    };
  }, [auth, socketLogout]);

  return (
    <socketIOContext.Provider
      value={{ socketLogin, socketLogout, socket, socketEmit }}
    >
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}
