import { createContext, useContext, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useFlasher } from './FlasherContext';
import { useSocketIO } from './SocketIOContext';
import { useUser } from './UserContext';
import { useModalDialog } from '../contexts/ModalDialogContext';

const serverAlertContext = createContext();

export default function ServerAlertContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { registerIoHandlers } = useSocketIO();
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
    [flash],
  );

  const receiveAlert = useCallback(
    (data) => {
      if (isAdmin || !data.admin_only) {
        revealModalDialog({ title: data.title, message: data.body });
      }
    },
    [isAdmin, revealModalDialog],
  );

  const receiveReload = useCallback(() => {
    controlledLog('got request to reload');
    window.location.reload();
  }, [controlledLog]);

  const getHandlers = useCallback(() => {
    return {
      server_send_flasher: receiveFlash,
      server_send_alert: receiveAlert,
      server_reload_user: receiveReload,
    };
  }, [receiveFlash, receiveAlert, receiveReload]);

  useEffect(() => {
    const context = 'ServerAlertContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

  return (
    <serverAlertContext.Provider value={{}}>
      {children}
    </serverAlertContext.Provider>
  );
}

export function useServerAlertContext() {
  return useContext(serverAlertContext);
}
