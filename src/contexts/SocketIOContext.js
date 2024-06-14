import React from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';

const socketIOContext = React.createContext();
let errorCallback = null;

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = React.useState(undefined);
  const [auth, setAuth] = React.useState(undefined);
  const [isPasswordReset, setIsPasswordReset] = React.useState(false);
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();

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
      } else {
        // check if there is a token in the URL
        // these are included in password reset links sent by email
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        if (token) {
          setAuth({ token });
          setIsPasswordReset(true);
        } else {
          // setting auth and user to null indicates that the user is not
          // logged in, which is different than the initial values of undefined
          // which mean that the app is still starting and trying to figure out
          // if the user can be authenticated or not.
          setAuth(null);
          setSocket(null);
          setIsPasswordReset(false);
        }
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
      setIsPasswordReset(false);
    });

    s.on('disconnect', (reason, _details) => {
      socketLogout();
      controlledLog('socket disconnect for reason: ' + reason);
      if (reason === 'io server disconnect') {
        const msg =
          'The Hepcat server disconnected here.' +
          ' It may be due to a login under the same account in a different location.';
        flash(msg, 'warning', 0);
      }
    });

    // Socket.IO handler for the server to push a flashed message */
    s.on('server_send_flasher', (data, cb) => {
      controlledLog('got flasher:');
      controlledLog(data);
      flash(data.message, data.type);

      // the server may request acknowledgement of this message, in that case
      // invoke the callback
      if (cb) {
        cb();
      }
    });

    return () => {
      s.disconnect();
    };
  }, [auth, controlledLog, socketLogout, flash]);

  return (
    <socketIOContext.Provider
      value={{
        socketLogin,
        socketLogout,
        socket,
        socketEmit,
        setToken,
        isPasswordReset: isPasswordReset,
        setIsPasswordReset: setIsPasswordReset,
      }}
    >
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}
