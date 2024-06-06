import React from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';

const socketIOContext = React.createContext();
let errorCallback = null;

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = React.useState(null);
  const [auth, setAuth] = React.useState(null);
  const { controlledLog } = useControlledLog();

  const socketLogin = React.useCallback((email, password, cb) => {
    errorCallback = cb;
    setAuth({ email, password });
  }, []);

  const socketLogout = React.useCallback(() => {
    window.sessionStorage.removeItem('token');
    setAuth(null);
    setSocket(null);
  }, []);

  const setToken = React.useCallback((token) => {
    window.sessionStorage.setItem('token', token);
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
      // if we have stored a token, then try to use it
      const token = window.sessionStorage.getItem('token');
      if (token) {
        setAuth({ token });
      }
      return;
    }
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const s = socketIOClient(endpt, { auth });
    setSocket(s);

    s.on('connect_error', (err) => {
      if (errorCallback) {
        errorCallback(
          err.message.includes('rejected')
            ? 'Invalid username or password.'
            : 'The server appears to be offline. Please try again later.',
        );
      }
      window.sessionStorage.removeItem('token');
      setSocket(null);
      setAuth(null);
    });

    s.on('disconnect', (reason, _details) => {
      socketLogout();
      controlledLog('socket disconnect for reason: ' + reason);
      if (reason === 'io server disconnect') {
        const msg =
          'The Hepcat server disconnected here.' +
          ' It may be due to a login under the same account in a different location.';
        alert(msg);
      }
    });

    return () => {
      s.disconnect();
    };
  }, [auth, controlledLog, socketLogout]);

  return (
    <socketIOContext.Provider
      value={{ socketLogin, socketLogout, socket, socketEmit, setToken }}
    >
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}
