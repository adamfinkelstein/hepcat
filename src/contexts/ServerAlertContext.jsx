import React, { useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useFlasher } from './FlasherContext';
import { useSocketHandler } from './SocketIOContext';
import { useUser } from './UserContext';
import { useModalDialog } from '../contexts/ModalDialogContext';

const serverAlertContext = React.createContext();

export default function ServerAlertContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { isAdmin } = useUser();

  const receiveFlash = useCallback(
    (data, cb) => {
      flash(data.message, data.type);
      if (cb) {
        // the server may request acknowledgement of this message, in that case
        // invoke the callback
        cb();
      }
    },
    [flash]
  );

  const receiveAlert = useCallback(
    (data) => {
      if (isAdmin || !data.admin_only) {
        revealModalDialog({ title: data.title, message: data.body });
      }
    },
    [isAdmin, revealModalDialog]
  );

  const receiveReload = useCallback(() => {
    controlledLog('got request to reload');
    window.location.reload();
  }, [controlledLog]);

  // register socket event handlers
  const ctx = 'ServerAlertContext';
  useSocketHandler('server_send_flasher', receiveFlash, ctx);
  useSocketHandler('server_send_alert', receiveAlert, ctx);
  useSocketHandler('server_reload_user', receiveReload, ctx);

  return (
    <serverAlertContext.Provider value={{}}>
      {children}
    </serverAlertContext.Provider>
  );
}

export function useServerAlertContext() {
  return React.useContext(serverAlertContext);
}
