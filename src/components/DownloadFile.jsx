// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useCallback } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketHandler } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';

const openUrlInNewTab = (url) => {
  window.open(url, '_blank', 'noreferrer');
};

export default function DownloadFile() {
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

  return <></>;
}
