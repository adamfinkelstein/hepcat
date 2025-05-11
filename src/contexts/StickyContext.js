import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useStorage } from './StorageContext';
import { useSocketIO } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';
const CryptoJS = require('crypto-js');

const STORAGE_KEY = 'stickyKeys'; // Key for localStorage

function genRandomKey(length) {
  const randomWordArray = CryptoJS.lib.WordArray.random(length / 2);
  const randomString = randomWordArray.toString(CryptoJS.enc.Hex);
  const slice = randomString.slice(0, length);
  return slice;
}

const stickyContext = createContext();

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
    [setUserLocalStorageItem],
  );

  const [stickyKeys, setStickyKeys] = useState(() =>
    loadStickyKeysFromStorage(),
  );

  // Update localStorage whenever stickyKeys changes
  useEffect(() => {
    saveStickyKeysToStorage(stickyKeys);
  }, [stickyKeys, saveStickyKeysToStorage]);

  const saveConfirmedSticky = useCallback(
    (data) => {
      const newKeys = stickyKeys ? { ...stickyKeys } : {};
      const { nid, idx, key } = data;
      data = { idx, key }; // save only the idx and key
      newKeys[nid] = data;
      setStickyKeys(newKeys);
    },
    [stickyKeys, setStickyKeys],
  );

  const forgetStickyKey = useCallback(
    (nid) => {
      if (!stickyKeys || !stickyKeys.hasOwnProperty(nid)) return;
      const newKeys = { ...stickyKeys };
      delete newKeys[nid];
      setStickyKeys(newKeys);
    },
    [stickyKeys, setStickyKeys],
  );

  const checkStickyIdIsValid = useCallback(
    (nid, check_idx) => {
      // controlledLog(`Check sticky for ${nid}: ${check_idx}`);
      if (!nid || !check_idx) return;
      if (!stickyKeys || !stickyKeys.hasOwnProperty(nid)) return;
      const { idx } = stickyKeys[nid];
      if (idx !== check_idx) {
        controlledLog(`Sticky for ${nid} outdated: ${idx} != ${check_idx}`);
        forgetStickyKey(nid);
      }
    },
    [stickyKeys, forgetStickyKey, controlledLog],
  );

  const sendSticky = useCallback(
    (nid, status) => {
      const key = genRandomKey(16);
      const data = { nid, status, key };
      socket.emit('user_set_sticky', data);
      controlledLog('Send sticky: ', data);
    },
    [socket, controlledLog],
  );

  const revokeSticky = useCallback(
    (nid) => {
      if (!stickyKeys || !stickyKeys.hasOwnProperty(nid)) {
        return false;
      }
      const { key } = stickyKeys[nid];
      const data = { nid, key };
      socketEmit('user_revoke_sticky', data);
      controlledLog('Revoke sticky: ', data);
      forgetStickyKey(nid);
      return true;
    },
    [socketEmit, stickyKeys, forgetStickyKey, controlledLog],
  );

  useEffect(() => {
    const receiveConfirmation = (data) => {
      controlledLog('received confirmation data', data);
      saveConfirmedSticky(data);
    };
    if (socket && 'on' in socket) {
      controlledLog('register socket handlers in StickyContext');
      socket.on('server_confirm_sticky', receiveConfirmation);
    }
    // cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers in StickyContext');
        socket.off('server_confirm_sticky', receiveConfirmation);
      }
    };
  }, [socket, controlledLog, saveConfirmedSticky]);

  return (
    <stickyContext.Provider
      value={{ stickyKeys, sendSticky, revokeSticky, checkStickyIdIsValid }}
    >
      {children}
    </stickyContext.Provider>
  );
}

export function useSticky() {
  return useContext(stickyContext);
}
