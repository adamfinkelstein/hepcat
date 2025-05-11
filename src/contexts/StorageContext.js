// Revised StorageContext.js
import React, { createContext, useContext, useCallback, useState } from 'react';
import { useControlledLog } from './ControlledLogContext';

const storageContext = createContext();

export default function StorageContext({ children }) {
  const { controlledLog } = useControlledLog();
  const [isInitialized, setIsInitialized] = useState(false);
  const [userID, setUserID] = useState(null);

  // Called by functions that read/write storage below.
  // This function ensures that the storage is initialized.
  // The main thing is it checks to see if the app version is current.
  // If not, it clears all localStorage and sessionStorage data.
  const ensureInitialized = useCallback(() => {
    controlledLog('+++ StorageContext: check if initialized');
    if (isInitialized) return;
    controlledLog('=== StorageContext: Initializing storage...');
    setIsInitialized(true);
    const appVersion = process.env.REACT_APP_VERSION;
    const appInLocalStorage = window.localStorage.getItem('app_version');
    if (appVersion && appVersion !== appInLocalStorage) {
      // Clear all localStorage and sessionStorage data
      window.sessionStorage.clear();
      window.localStorage.clear();
      // Save the app version to localStorage,
      // so this will only happen once per version change.
      window.localStorage.setItem('app_version', appVersion);
      controlledLog('Cleared storage and updated to app version:', appVersion);
    }
  }, [isInitialized, setIsInitialized, controlledLog]);

  // Generic function to get item from storage
  const getStorageItem = useCallback(
    (key, useLocal = true) => {
      ensureInitialized();
      const storage = useLocal ? window.localStorage : window.sessionStorage;
      const storageType = useLocal ? 'LocalStorage' : 'SessionStorage';
      try {
        const json = storage.getItem(key);
        controlledLog(`${storageType} get ${key}: ${json}`);
        return json ? JSON.parse(json) : null;
      } catch (error) {
        controlledLog(`${storageType} get error: ${error.message}`);
        return null;
      }
    },
    [ensureInitialized, controlledLog],
  );

  // Generic function to set item in storage
  // value null means remove the item
  const setStorageItem = useCallback(
    (key, value, useLocal = true) => {
      ensureInitialized();
      const storage = useLocal ? window.localStorage : window.sessionStorage;
      const storageType = useLocal ? 'LocalStorage' : 'SessionStorage';
      try {
        if (value === null) {
          storage.removeItem(key);
          controlledLog(`${storageType} remove: ${key}`);
        } else {
          const json = JSON.stringify(value);
          storage.setItem(key, json);
          controlledLog(`${storageType} set ${key}: ${json}`);
        }
      } catch (error) {
        controlledLog(`${storageType} set error: ${error.message}`);
      }
    },
    [ensureInitialized, controlledLog],
  );

  // User-specific functions
  const getUserStorageItem = useCallback(
    (key, useLocal = true) => {
      if (!userID) {
        controlledLog('getUserStorageItem: No userID available');
        return null;
      }
      const userKey = `${userID}:${key}`;
      return getStorageItem(userKey, useLocal);
    },
    [userID, getStorageItem, controlledLog],
  );

  const setUserStorageItem = useCallback(
    (key, value, useLocal = true) => {
      if (!userID) {
        controlledLog(`setUserStorageItem ${key}: No userID available`);
        return;
      }
      const userKey = `${userID}:${key}`;
      setStorageItem(userKey, value, useLocal);
    },
    [userID, setStorageItem, controlledLog],
  );

  // Specific functions that use the generic helpers
  const getLocalStorageItem = useCallback(
    (key) => getStorageItem(key, true),
    [getStorageItem],
  );

  const setLocalStorageItem = useCallback(
    (key, value) => setStorageItem(key, value, true),
    [setStorageItem],
  );

  const getSessionStorageItem = useCallback(
    (key) => getStorageItem(key, false),
    [getStorageItem],
  );

  const setSessionStorageItem = useCallback(
    (key, value) => setStorageItem(key, value, false),
    [setStorageItem],
  );

  const getUserLocalStorageItem = useCallback(
    (key) => getUserStorageItem(key, true),
    [getUserStorageItem],
  );

  const setUserLocalStorageItem = useCallback(
    (key, value) => setUserStorageItem(key, value, true),
    [setUserStorageItem],
  );

  const getUserSessionStorageItem = useCallback(
    (key) => getUserStorageItem(key, false),
    [getUserStorageItem],
  );

  const setUserSessionStorageItem = useCallback(
    (key, value) => setUserStorageItem(key, value, false),
    [setUserStorageItem],
  );

  return (
    <storageContext.Provider
      value={{
        // Regular storage functions
        getLocalStorageItem,
        setLocalStorageItem,
        getSessionStorageItem,
        setSessionStorageItem,
        // User-specific storage functions
        getUserLocalStorageItem,
        setUserLocalStorageItem,
        getUserSessionStorageItem,
        setUserSessionStorageItem,
        // Function to set userID
        setStorageUserID: setUserID,
      }}
    >
      {children}
    </storageContext.Provider>
  );
}

export function useStorage() {
  return useContext(storageContext);
}
