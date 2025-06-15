// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useEffect, useCallback } from 'react';
import { useStorage } from './StorageContext';
import { useSocketIO, useSocketHandler } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';

const STORAGE_KEY = 'stickyKeys'; // Key for localStorage

function genRandomKey(length) {
  return crypto.randomUUID().slice(0, length);
}

const stickyContext = React.createContext();

export default function StickyContext({ children }) {
  const { socket, socketEmit } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { getUserLocalStorageItem, setUserLocalStorageItem } = useStorage();

  // Load sticky keys from storage
  const loadStickyKeysFromStorage = useCallback(() => {
    const storedKeys = getUserLocalStorageItem(STORAGE_KEY);
    return storedKeys ? storedKeys : {};
  }, [getUserLocalStorageItem]);

  // Save sticky keys to storage
  const saveStickyKeysToStorage = useCallback(
    (sKeys) => {
      if (sKeys && Object.keys(sKeys).length) {
        setUserLocalStorageItem(STORAGE_KEY, sKeys);
      } else {
        setUserLocalStorageItem(STORAGE_KEY, null); // remove the item
      }
    },
    [setUserLocalStorageItem]
  );

  const [stickyKeys, setStickyKeys] = useState(() =>
    loadStickyKeysFromStorage()
  );

  // Update localStorage whenever stickyKeys changes
  useEffect(() => {
    saveStickyKeysToStorage(stickyKeys);
  }, [stickyKeys, saveStickyKeysToStorage]);

  const saveConfirmedSticky = useCallback(
    (data) => {
      const { nid, idx, key } = data;
      const savedData = { idx, key };

      setStickyKeys((prevStickyKeys) => ({
        ...prevStickyKeys, // never null (see loadStickyKeysFromStorage)
        [nid]: savedData,
      }));
    },
    [setStickyKeys]
  );

  const forgetStickyKey = useCallback(
    (nid) => {
      setStickyKeys((prevStickyKeys) => {
        // no change if that key does not exist
        if (!prevStickyKeys?.[nid]) return prevStickyKeys;
        // make copy without that key
        const { [nid]: _removed, ...newKeys } = prevStickyKeys;
        return newKeys;
      });
    },
    [setStickyKeys]
  );

  const checkStickyIdIsValid = useCallback(
    (nid, check_idx) => {
      if (!nid || !check_idx) return;
      if (!stickyKeys?.[nid]) return;
      const { idx } = stickyKeys[nid];
      if (idx !== check_idx) {
        controlledLog(`Sticky for ${nid} outdated: ${idx} != ${check_idx}`);
        forgetStickyKey(nid);
      }
    },
    [stickyKeys, forgetStickyKey, controlledLog]
  );

  const sendSticky = useCallback(
    (nid, status) => {
      const key = genRandomKey(16);
      const data = { nid, status, key };
      socket.emit('user_set_sticky', data);
      controlledLog('Send sticky: ', data);
    },
    [socket, controlledLog]
  );

  const revokeSticky = useCallback(
    (nid) => {
      if (!stickyKeys?.[nid]) return false;
      const { key } = stickyKeys[nid];
      const data = { nid, key };
      socketEmit('user_revoke_sticky', data);
      controlledLog('Revoke sticky: ', data);
      forgetStickyKey(nid);
      return true;
    },
    [socketEmit, stickyKeys, forgetStickyKey, controlledLog]
  );

  const receiveConfirmation = useCallback(
    (data) => {
      controlledLog('received confirmation data', data);
      saveConfirmedSticky(data);
    },
    [controlledLog, saveConfirmedSticky]
  );

  // register socket event handlers
  const ctx = 'StickyContext';
  useSocketHandler('server_confirm_sticky', receiveConfirmation, ctx);

  return (
    <stickyContext.Provider
      value={{ stickyKeys, sendSticky, revokeSticky, checkStickyIdIsValid }}
    >
      {children}
    </stickyContext.Provider>
  );
}

export function useSticky() {
  return React.useContext(stickyContext);
}
