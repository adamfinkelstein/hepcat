import moment from 'moment';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useSocketIO } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';

const adminContext = createContext();

const notSetYetMsg = '(not set)';

export default function AdminContext({ children }) {
  const { socketEmit, registerIoHandlers } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const [disableLogins, setDisableLogins] = useState(false);
  const [probeGUIMsg, setProbeGUIMsg] = useState(notSetYetMsg);
  const [probeTextMsg, setProbeTextMsg] = useState(notSetYetMsg);
  const [fileUploads, setFileUploads] = useState(null);
  const [locBar, setLocBar] = useState(''); // value in set bar input text box
  const [locHideQ, setLocHideQ] = useState(false); // checkbox to hide queue
  const [locHideMsg, setLocHideMsg] = useState(''); // text box msg
  const [updateStatus, setUpdateStatus] = useState('Tabled');

  // Called by AppContext when new Queue arrives.
  // Reset both probes to not set yet.
  const resetProbeMsgs = useCallback(() => {
    controlledLog('reset probes');
    setProbeGUIMsg(notSetYetMsg);
    setProbeTextMsg(notSetYetMsg);
  }, [controlledLog, setProbeGUIMsg, setProbeTextMsg]);

  // Update admin local variables from AppContext.
  const recordAdminGlobs = useCallback(
    (data) => {
      controlledLog('recordAdminGlobs', data);
      setLocHideQ(data.hide_queue);
      setLocHideMsg(data.message);
      if (data.current_status) {
        setUpdateStatus(data.current_status);
      }
    },
    [controlledLog, setLocHideQ, setLocHideMsg],
  );

  // Called by component that has the switch.
  // Emit changes to server.
  const updateDisableLogins = useCallback(
    (disable) => {
      if (disable === disableLogins) return; // no change
      setDisableLogins(disable);
      socketEmit('admin_set_disable_logins', disable);
      controlledLog('admin_set_disable_logins: ', disable);
    },
    [disableLogins, setDisableLogins, socketEmit, controlledLog],
  );

  // called by server broadcast of a change to some switch.
  const receiveDisableLogins = useCallback(
    (disabled) => {
      controlledLog('receiveDisableLogin', disabled);
      setDisableLogins(disabled);
    },
    [setDisableLogins, controlledLog],
  );

  const receiveFileUploads = useCallback(
    (file_uploads) => {
      controlledLog('received file uploads:', file_uploads);
      setFileUploads(file_uploads);
    },
    [setFileUploads, controlledLog],
  );

  const getMsgFromProbe = useCallback(
    (countStr, label) => {
      const now = Date.now();
      const fmtNow = moment.utc(now).local().format('ddd h:mm:ss');
      const fmtMsg = countStr + ' — updated ' + fmtNow;
      const msg = !countStr.length ? notSetYetMsg : fmtMsg;
      controlledLog('received probe ' + label + ' ' + msg);
      return msg;
    },
    [controlledLog],
  );

  const receiveProbeGui = useCallback(
    (countStr) => {
      const msg = getMsgFromProbe(countStr, 'GUI');
      setProbeGUIMsg(msg);
    },
    [getMsgFromProbe, setProbeGUIMsg],
  );

  const receiveProbeText = useCallback(
    (countStr) => {
      const msg = getMsgFromProbe(countStr, 'text');
      setProbeTextMsg(msg);
    },
    [getMsgFromProbe, setProbeTextMsg],
  );

  const getHandlers = useCallback(() => {
    return {
      server_relay_disable_logins: receiveDisableLogins,
      server_probe_by_gui: receiveProbeGui,
      server_probe_by_text: receiveProbeText,
      server_file_uploads: receiveFileUploads,
    };
  }, [
    receiveDisableLogins,
    receiveProbeGui,
    receiveProbeText,
    receiveFileUploads,
  ]);

  useEffect(() => {
    const context = 'AdminContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

  return (
    <adminContext.Provider
      value={{
        resetProbeMsgs,
        probeGUIMsg,
        probeTextMsg,
        fileUploads,
        disableLogins,
        updateDisableLogins,
        recordAdminGlobs,
        updateStatus,
        setUpdateStatus,
        locBar,
        setLocBar,
        locHideQ,
        setLocHideQ,
        locHideMsg,
        setLocHideMsg,
      }}
    >
      {children}
    </adminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(adminContext);
}
