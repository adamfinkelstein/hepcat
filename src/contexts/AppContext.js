import moment from 'moment';
import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';
import { useUser } from './UserContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useKey } from './KeyContext';
import { useGrid } from './GridContext';

const AppGlobalsContext = createContext();

const statusList = ['Tabled', 'Reject', 'Conference', 'Journal'];
const notSetYetMsg = '(not set)';

export function useAppGlobals() {
  return useContext(AppGlobalsContext);
}

export default function AppContext({ children }) {
  const { controlledLog, setShowLogs } = useControlledLog();
  const { socket, socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
  const { decryptObjectOrNull } = useKey();
  const { user, isAdmin, paperKeys, roomChoice } = useUser();
  const { updateGridEntry } = useGrid();
  const [queue, setQueue] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [probeGUIMsg, setProbeGUIMsg] = useState(notSetYetMsg);
  const [probeTextMsg, setProbeTextMsg] = useState(notSetYetMsg);
  const [fileUploads, setFileUploads] = useState(null);
  const [serverGlobs, setServerGlobs] = useState(null);
  const [newStatus, setNewStatus] = useState('Tabled');
  const [appBar, setAppBar] = useState(''); // actual bar value
  const [guiBar, setGuiBar] = useState(''); // value in set bar input text box
  const [hideQ, setHideQ] = useState(false);
  const [hiddenMsg, setHiddenMsg] = useState('');

  const recordGlobsForThisRoom = useCallback(
    (data) => {
      controlledLog('record globs for this room:');
      controlledLog(data);
      // data.message = getTimeInHiddenMessage(data.message);
      setHideQ(data.hide_queue);
      setHiddenMsg(data.message);
      if ('showAppLogs' in data) {
        // could be true or false or not exist
        setShowLogs(data.showAppLogs);
      }
      setServerGlobs(data);
      const curr = data ? data.current : 0;
      const status = data ? data.current_status : null;
      setQueueCurrent(curr);
      if (status) {
        setNewStatus(status);
      }
    },
    [
      controlledLog,
      setShowLogs,
      setServerGlobs,
      setQueueCurrent,
      setNewStatus,
      setHideQ,
      setHiddenMsg,
    ],
  );

  useEffect(() => {
    controlledLog('roomChoice is now ' + roomChoice);
    socketEmit('user_request_queue', roomChoice);
  }, [roomChoice, controlledLog, socketEmit]);

  useEffect(() => {
    const updateQueueEntry = (queue_index, status) => {
      if (queue_index < 0 || queue_index >= queue.length) {
        controlledLog('cannot updateQueueEntry at queue_index ', queue_index);
        return;
      }
      queue[queue_index].status = status;
      const newQueue = [...queue];
      setQueue(newQueue); // force update
    };

    const receiveGlobs = (data) => {
      if (!data) {
        controlledLog('WARNING! received globs with empty data');
        return;
      }
      controlledLog('received globs:');
      controlledLog(data);
      // if there was an update, it was encrypted, so get it...
      if (data.update_encrypted) {
        data.update = decryptObjectOrNull(data.update_encrypted);
        controlledLog('decrypt update:');
        controlledLog(data.update);
      }
      const isTheRoom = data.room === roomChoice;
      if (isTheRoom) {
        recordGlobsForThisRoom(data);
        if (data.update) {
          updateQueueEntry(data.update.queue_index, data.update.status);
        }
      }
      if (data.update) {
        updateGridEntry(data.update.grid_update);
      }
      // bar is same for all rooms
      const barString = data.bar + '';
      setAppBar(barString);
      setGuiBar(barString);
      // controlledLog('set bar to:', barString);
    };

    const decryptPaperQueue = (arr) => {
      const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
      const result = arr.map((p) => {
        const dec = decryptObjectOrNull(p);
        const safe = dec ? dec : dummy;
        return safe;
      });
      return result;
    };

    const receiveQueue = (data) => {
      controlledLog('received queue:');
      controlledLog(data);
      const room = data.globs.room;
      const isTheRoom = room === roomChoice;
      const msg = `receiveQueue compare rooms: ${room} ${roomChoice} ${isTheRoom}`;
      controlledLog(msg);
      if (isTheRoom) {
        data.paper_list = decryptPaperQueue(data.paper_list_encrypted);
        setQueue(data.paper_list);
        receiveGlobs(data.globs);
        setProbeGUIMsg(notSetYetMsg); // when queue arrives, invalidate probe
        setProbeTextMsg(notSetYetMsg);
      } else {
        // maybe need to check for other updates????XXX
      }
    };

    const receiveFileUploads = (file_uploads) => {
      controlledLog('received file upload status:');
      controlledLog(file_uploads);
      setFileUploads(file_uploads);
    };

    const getMsgFromProbe = (countStr, label) => {
      const now = Date.now();
      const fmtNow = moment.utc(now).local().format('ddd h:mm:ss');
      const fmtMsg = countStr + ' — updated ' + fmtNow;
      const msg = !countStr.length ? notSetYetMsg : fmtMsg;
      controlledLog('received probe ' + label + ' ' + msg);
      return msg;
    };

    const receiveProbe = (countStr) => {
      const msg = getMsgFromProbe(countStr, 'GUI');
      setProbeGUIMsg(msg);
    };

    const receiveProbeText = (countStr) => {
      const msg = getMsgFromProbe(countStr, 'text');
      setProbeTextMsg(msg);
    };

    const receiveAlert = (data) => {
      if (isAdmin || !data.admin_only) {
        revealModalDialog({ title: data.title, message: data.body });
      }
    };

    const receiveReload = () => {
      controlledLog('got request to reload');
      window.location.reload();
    };

    if (socket && 'on' in socket) {
      controlledLog('register socket handlers in AppContext');
      socket.on('server_set_queue', receiveQueue);
      socket.on('server_set_globs', receiveGlobs);
      socket.on('server_send_alert', receiveAlert);
      socket.on('server_probe_count', receiveProbe);
      socket.on('server_probe_text_count', receiveProbeText);
      socket.on('server_file_uploads', receiveFileUploads);
      socket.on('server_reload_user', receiveReload);
    }

    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers in AppContext');
        socket.off('server_set_queue', receiveQueue);
        socket.off('server_set_globs', receiveGlobs);
        socket.off('server_send_alert', receiveAlert);
        socket.off('server_probe_count', receiveProbe);
        socket.off('server_probe_text_count', receiveProbeText);
        socket.off('server_file_uploads', receiveFileUploads);
        socket.off('server_reload_user', receiveReload);
      }
    };
  }, [
    queue,
    socket,
    isAdmin,
    roomChoice,
    user,
    paperKeys,
    controlledLog,
    socketEmit,
    revealModalDialog,
    recordGlobsForThisRoom,
    decryptObjectOrNull,
    updateGridEntry,
  ]);

  return (
    <AppGlobalsContext.Provider
      value={{
        queue,
        queueCurrent,
        newStatus,
        setNewStatus,
        serverGlobs,
        probeGUIMsg,
        probeTextMsg,
        fileUploads,
        appBar,
        guiBar,
        setGuiBar,
        hideQ,
        setHideQ,
        hiddenMsg,
        setHiddenMsg,
        statusList,
      }}
    >
      {children}
    </AppGlobalsContext.Provider>
  );
}
