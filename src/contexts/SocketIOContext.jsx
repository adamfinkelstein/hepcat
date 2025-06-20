// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useEffect, useCallback } from 'react';
import socketIOClient from 'socket.io-client';
import { useControlledLog } from './ControlledLogContext';
import { useModalDialog } from './ModalDialogContext';
import { useStorage } from './StorageContext';

const socketIOContext = React.createContext();
let errorCallback = null;

const TOKEN_STORAGE_KEY = 'io_login_token';

export default function SocketIOContext({ children }) {
  const [socket, setSocket] = useState(undefined);
  const [auth, setAuth] = useState(undefined);
  const { controlledLog } = useControlledLog();
  const { revealModalDialog } = useModalDialog();
  const {
    localStorageItemGet,
    localStorageItemSet,
    sessionStorageItemGet,
    sessionStorageItemSet,
  } = useStorage();

  const tokenStorageSet = useCallback(
    (token, remember) => {
      if (remember) {
        localStorageItemSet(TOKEN_STORAGE_KEY, token);
        sessionStorageItemSet(TOKEN_STORAGE_KEY, null); // remove, just in case
        return;
      }
      // if not already in local storage, write to session storage
      if (!localStorageItemGet(TOKEN_STORAGE_KEY)) {
        sessionStorageItemSet(TOKEN_STORAGE_KEY, token);
      }
    },
    [localStorageItemGet, localStorageItemSet, sessionStorageItemSet]
  );

  const tokenStorageGet = useCallback(() => {
    // first check local storage, then session storage
    const token = localStorageItemGet(TOKEN_STORAGE_KEY);
    if (token) return token;
    return sessionStorageItemGet(TOKEN_STORAGE_KEY);
  }, [localStorageItemGet, sessionStorageItemGet]);

  const tokenStorageClear = useCallback(() => {
    sessionStorageItemSet(TOKEN_STORAGE_KEY, null);
    localStorageItemSet(TOKEN_STORAGE_KEY, null);
  }, [sessionStorageItemSet, localStorageItemSet]);

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
    [tokenStorageClear]
  );

  const socketAuthTokenSet = useCallback(
    (token) => {
      tokenStorageSet(token, auth?.remember);
    },
    [auth, tokenStorageSet]
  );

  const socketEmit = useCallback(
    (message, data) => {
      if (!socket?.connected || !socket?.emit) {
        controlledLog('socket does not exist, message not sent:', message);
        return;
      }
      if (data !== undefined) {
        socket.emit(message, data);
        controlledLog('socketEmit: ' + message + ' data: ', data);
      } else {
        socket.emit(message);
        controlledLog('socketEmit: ' + message + ' (no data)');
      }
    },
    [socket, controlledLog]
  );

  const handleDisconnect = useCallback(
    (reason, _details) => {
      // notes on possible reason...
      // machine sleeps: 'transport close'
      // server disconnect: 'io server disconnect'
      // see: https://socket.io/docs/v3/client-socket-instance/
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
    },
    [controlledLog, revealModalDialog]
  );

  const handleConnectError = useCallback(
    (err) => {
      if (errorCallback) {
        const msg =
          !err.message || err.message.includes('xhr')
            ? 'The server appears to be offline. Please try again later.'
            : err.message;
        errorCallback(msg);
      }
      tokenStorageClear();
      setAuth(null);
      setSocket(null);
    },
    [tokenStorageClear]
  );

  /*
  This callback is used to check if the user is authenticated.
  Initially, auth is undefined, which means that the app is still
  starting and trying to figure out if the user can be authenticated.
  We check for a token in local/session storage. If it does not exist,
  we set the auth to null, which indicates that the user is not logged in.
  If the token does exist, we set the auth to contain the token.
  This will trigger a re-render of the component, and the socket connection
  will be attempted using this token on the NEXT render. This is more
  efficient that trying to connect immediately, because there will be
  a next render anyway, and we can avoid double-connecting.
  */
  const isAuthenticated = useCallback(() => {
    if (auth) return true; // already authenticated

    // not authenticated, so check for token
    const token = tokenStorageGet();
    if (token) {
      setAuth({ token }); // will cause a re-render
    } else {
      setAuth(null);
      setSocket(null);
    }
    return false;
  }, [auth, tokenStorageGet]);

  useEffect(() => {
    if (!isAuthenticated()) return;

    const endpt = process.env.VITE_SOCKET_ENDPOINT || window.location.origin;
    const s = socketIOClient(endpt, { auth });
    setSocket(s);

    s.on('connect_error', handleConnectError);
    s.on('disconnect', handleDisconnect);

    return () => {
      // these are nice, not strictly needed due to disconnect below.
      s.off('connect_error', handleConnectError);
      s.off('disconnect', handleDisconnect);
      s.disconnect();
    };
  }, [isAuthenticated, auth, handleConnectError, handleDisconnect]);

  return (
    <socketIOContext.Provider
      value={{
        socket,
        socketLogin,
        socketLogout,
        socketEmit,
        socketAuthTokenSet,
      }}
    >
      {children}
    </socketIOContext.Provider>
  );
}

export function useSocketIO() {
  return React.useContext(socketIOContext);
}

// Custom hook for registering socket handler
export function useSocketHandler(event, handler, handlerName) {
  const { socket } = useSocketIO();
  const { controlledLog } = useControlledLog();

  useEffect(() => {
    const registerOnOrOffHandler = (event, handler, msg, onOrOff) => {
      if (!socket) return;
      const verbose = false;
      if (verbose) {
        controlledLog(onOrOff.toUpperCase() + ' ' + msg);
      }
      socket[onOrOff](event, handler);
    };

    const msg = 'socket event: ' + event + ' handler name: ' + handlerName;
    registerOnOrOffHandler(event, handler, msg, 'on');
    return () => {
      registerOnOrOffHandler(event, handler, msg, 'off');
    };
  }, [socket, controlledLog, event, handler, handlerName]);
}
