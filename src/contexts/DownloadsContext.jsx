import React, { useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketHandler } from './SocketIOContext';
import { useUser } from './UserContext';

const openUrlInNewTab = (url) => {
  window.open(url, '_blank', 'noreferrer');
};

const downloadsContext = React.createContext();

export default function DownloadsContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { isAdmin } = useUser();

  const receiveDownload = useCallback(
    (data) => {
      const { filename, key } = data;
      const href = '/admin/download_file/' + filename + '/' + key;
      controlledLog('receiveDownload: ' + href);
      if (!isAdmin) return;
      openUrlInNewTab(href);
    },
    [controlledLog, isAdmin]
  );

  // register socket event handlers
  const ctx = 'DownloadsContext';
  useSocketHandler('server_send_download', receiveDownload, ctx);

  return (
    <downloadsContext.Provider value={{}}>{children}</downloadsContext.Provider>
  );
}

export function useDownloadsContext() {
  return React.useContext(downloadsContext);
}
