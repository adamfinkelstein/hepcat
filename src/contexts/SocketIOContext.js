import React from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';

const socketIOContext = React.createContext();
let errorCallback = null;

const tokenName = 'token';

const tokenStorageSet = (token, remember) => {
  if (remember) {
    console.log('set and remember token ' + token);
    window.localStorage.setItem(tokenName, token);
  } else {
    console.log('set token ' + token);
    window.sessionStorage.setItem(tokenName, token);
  }
};

const tokenStorageGet = () => {
  let token = window.localStorage.getItem(tokenName);
  if (token) {
    console.log('get remembered token ' + token);
  } else {
    token = window.sessionStorage.getItem(tokenName);
    console.log('get token ' + token);
  }
  return token;
};

const tokenStorageClear = () => {
  console.log('clear token');
  window.sessionStorage.removeItem(tokenName);
  window.localStorage.removeItem(tokenName);
};

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = React.useState(undefined);
  const [auth, setAuth] = React.useState(undefined);
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();

  const socketLogin = React.useCallback((email, password, remember, cb) => {
    errorCallback = cb;
    setAuth({ email, password, remember });
  }, []);

  const socketLogout = React.useCallback((clearToken) => {
    if (clearToken) tokenStorageClear();
    setAuth(null);
    setSocket(null);
  }, []);

  const socketSetAuthToken = React.useCallback(
    (token) => {
      tokenStorageSet(token, auth?.remember);
    },
    [auth],
  );

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
      const token = tokenStorageGet();
      if (token) {
        setAuth({ token });
      } else {
        // setting auth and user to null indicates that the user is not
        // logged in, which is different than the initial values of undefined
        // which mean that the app is still starting and trying to figure out
        // if the user can be authenticated or not.
        setAuth(null);
        setSocket(null);
      }
      return;
    }
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const s = socketIOClient(endpt, { auth });
    setSocket(s);

    s.on('connect_error', (err) => {
      const isRejected = err.message.includes('rejected');
      if (errorCallback) {
        errorCallback(
          isRejected
            ? 'Invalid username or password.'
            : 'The server appears to be offline. Please try again later.',
        );
      }
      // if (isRejected) tokenStorageClear();
      setSocket(null);
      setAuth(null);
    });

    s.on('disconnect', (reason, _details) => {
      // notes on possible reason...
      // machine sleeps: 'transport close'
      // server disconnect: 'io server disconnect'
      controlledLog('socket disconnect for reason: ' + reason);
      const serverDisconnect = reason === 'io server disconnect';
      socketLogout(serverDisconnect);
      if (serverDisconnect) {
        const msg =
          'The Hepcat server disconnected here.' +
          ' It may be due to a login under the same account in a different location.';
        // flash(msg, 'warning', 0);
        revealModalDialog('Disconnected', msg);
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
  }, [auth, controlledLog, flash, revealModalDialog, socketLogout]);

  return (
    <socketIOContext.Provider
      value={{
        socketLogin,
        socketLogout,
        socket,
        socketEmit,
        socketSetAuthToken,
      }}
    >
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}
