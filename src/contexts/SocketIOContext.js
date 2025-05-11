import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';
import { useFlasher } from './FlasherContext';
import { useModalDialog } from './ModalDialogContext';
import { useStorage } from './StorageContext';

const socketIOContext = createContext();
let errorCallback = null;

const TOKEN_STORAGE_KEY = 'io_login_token';

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = useState(undefined);
  const [auth, setAuth] = useState(undefined);
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const {
    getLocalStorageItem,
    setLocalStorageItem,
    getSessionStorageItem,
    setSessionStorageItem,
  } = useStorage();

  const tokenStorageSet = useCallback(
    (token, remember) => {
      if (remember) {
        setLocalStorageItem(TOKEN_STORAGE_KEY, token);
        setSessionStorageItem(TOKEN_STORAGE_KEY, null); // remove, just in case
        return;
      }
      // if not already in local storage, write to session storage
      if (!getLocalStorageItem(TOKEN_STORAGE_KEY)) {
        setSessionStorageItem(TOKEN_STORAGE_KEY, token);
      }
    },
    [getLocalStorageItem, setLocalStorageItem, setSessionStorageItem],
  );

  const tokenStorageGet = useCallback(() => {
    // first check local storage, then session storage
    const token = getLocalStorageItem(TOKEN_STORAGE_KEY);
    if (token) return token;
    return getSessionStorageItem(TOKEN_STORAGE_KEY);
  }, [getLocalStorageItem, getSessionStorageItem]);

  const tokenStorageClear = useCallback(() => {
    setSessionStorageItem(TOKEN_STORAGE_KEY, null);
    setLocalStorageItem(TOKEN_STORAGE_KEY, null);
  }, [setSessionStorageItem, setLocalStorageItem]);

  const socketLogin = useCallback((email, password, remember, cb) => {
    errorCallback = cb;
    setAuth({ email, password, remember });
  }, []);

  const socketLogout = useCallback(
    (clearToken) => {
      if (clearToken) tokenStorageClear();
      setAuth(null);
      setSocket(null);
    },
    [tokenStorageClear],
  );

  const socketSetAuthToken = useCallback(
    (token) => {
      tokenStorageSet(token, auth?.remember);
    },
    [auth, tokenStorageSet],
  );

  const socketEmit = useCallback(
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

  useEffect(() => {
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
      if (errorCallback) {
        const msg =
          !err.message || err.message.includes('xhr')
            ? 'The server appears to be offline. Please try again later.'
            : err.message;
        errorCallback(msg);
      }
      tokenStorageClear();
      setSocket(null);
      setAuth(null);
    });

    s.on('disconnect', (reason, _details) => {
      // notes on possible reason...
      // machine sleeps: 'transport close'
      // server disconnect: 'io server disconnect'
      controlledLog('socket disconnect for reason: ' + reason);
      const serverDisconnect = reason === 'io server disconnect';
      if (serverDisconnect) {
        const msg = (
          <>
            <p>The connection to the Hepcat server was interrupted.</p>
            <p>
              This may be due to a login under the same account in a different
              location, or because the server is undergoing maintenance.
            </p>
          </>
        );
        // flash(msg, 'warning', 0);
        revealModalDialog({
          title: 'Disconnected',
          message: msg,
          close: false,
          button: 'Reconnect',
          onOK: () => {
            // changing auth will cause this effect function to run again and
            // attempt to login
            setAuth(null);
          },
        });
      }
    });

    // Socket.IO handler for the server to push a flashed message */
    s.on('server_send_flasher', (data, cb) => {
      // controlledLog('got flasher:');
      // controlledLog(data);
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
  }, [
    auth,
    controlledLog,
    flash,
    revealModalDialog,
    socketLogout,
    tokenStorageClear,
    tokenStorageGet,
  ]);

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
  return useContext(socketIOContext);
}
