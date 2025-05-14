import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';
import { useFlasher } from './FlasherContext';
import { useUser } from './UserContext';
import { useKey } from './KeyContext';
import { useGrid } from './GridContext';
import { useAdmin } from './AdminContext';

const AppGlobalsContext = createContext();

export function useAppGlobals() {
  return useContext(AppGlobalsContext);
}

export default function AppContext({ children }) {
  const { controlledLog, setShowLogs } = useControlledLog();
  const { isAdmin, roomChoice } = useUser();
  const { socketEmit, registerIoHandlers } = useSocketIO();
  const { decryptObjectOrNull } = useKey();
  const { updateGridEntry } = useGrid();
  const { resetProbeMsgs, recordAdminGlobs, setLocBar } = useAdmin();
  const { flash } = useFlasher();
  const [queue, setQueue] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [serverGlobs, setServerGlobs] = useState(null);
  const [globBar, setGlobBar] = useState(''); // actual bar value

  // When room choice changes, emit request to server.
  useEffect(() => {
    controlledLog('roomChoice is now ' + roomChoice);
    socketEmit('user_request_queue', roomChoice);
  }, [roomChoice, controlledLog, socketEmit]);

  const recordGlobsForThisRoom = useCallback(
    (data) => {
      controlledLog('record globs for this room:', data);
      if ('showAppLogs' in data) {
        // could be true or false or not exist
        setShowLogs(data.showAppLogs);
      }
      if (isAdmin) {
        recordAdminGlobs(data);
      }
      setServerGlobs(data);
      const curr = data ? data.current : 0;
      setQueueCurrent(curr);
    },
    [
      controlledLog,
      isAdmin,
      setShowLogs,
      setServerGlobs,
      setQueueCurrent,
      recordAdminGlobs,
    ],
  );

  const updateQueueEntry = useCallback(
    (queue_index, status) => {
      if (queue_index < 0 || queue_index >= queue.length) {
        controlledLog('cannot updateQueueEntry at queue_index ', queue_index);
        return;
      }
      queue[queue_index].status = status;
      const newQueue = [...queue];
      setQueue(newQueue); // force update
    },
    [controlledLog, queue, setQueue],
  );

  // called on receiving data from either:
  //   server_set_queue or server_set_globs
  const receiveGlobs = useCallback(
    (data) => {
      controlledLog('received globs:', data);
      // if there was an update, it was encrypted, so get it...
      if (data.update_encrypted) {
        data.update = decryptObjectOrNull(data.update_encrypted);
        controlledLog('decrypt update:', data.update);
      }
      const isTheRoom = data.room === roomChoice;
      if (isTheRoom) {
        recordGlobsForThisRoom(data);
        if (data.update) {
          const index = data.update.queue_index;
          const status = data.update.status;
          const nid = data.update.nid;
          const msg = `Update: Q${index + 1} (${nid}) is ${status}.`;
          flash(msg, 'info', 3);
          updateQueueEntry(index, status);
        }
      }
      if (data.update) {
        updateGridEntry(data.update.grid_update);
      }
      if ('bar' in data) {
        // bar is same for all rooms
        const barNum = data.bar;
        const barString = barNum.toString();
        setGlobBar(barString);
        controlledLog('set bar to:', barString);
        if (isAdmin) {
          setLocBar(barString);
        }
      }
    },
    [
      isAdmin,
      controlledLog,
      roomChoice,
      recordGlobsForThisRoom,
      flash,
      updateQueueEntry,
      updateGridEntry,
      setLocBar,
      setGlobBar,
      decryptObjectOrNull,
    ],
  );

  const decryptPaperQueue = useCallback(
    (arr) => {
      const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
      const result = arr.map((p) => {
        const dec = decryptObjectOrNull(p);
        const safe = dec ? dec : dummy;
        return safe;
      });
      return result;
    },
    [decryptObjectOrNull],
  );

  const receiveQueue = useCallback(
    (data) => {
      controlledLog('received queue:', data);
      const room = data.globs.room;
      const isTheRoom = room === roomChoice;
      // const msg = `receiveQueue compare rooms: ${room} ${roomChoice} ${isTheRoom}`;
      // controlledLog(msg);
      if (isTheRoom) {
        data.paper_list = decryptPaperQueue(data.paper_list_encrypted);
        setQueue(data.paper_list);
        receiveGlobs(data.globs);
        resetProbeMsgs();
      }
    },
    [
      controlledLog,
      roomChoice,
      decryptPaperQueue,
      setQueue,
      receiveGlobs,
      resetProbeMsgs,
    ],
  );

  const getHandlers = useCallback(() => {
    return {
      server_set_queue: receiveQueue,
      server_set_globs: receiveGlobs,
    };
  }, [receiveQueue, receiveGlobs]);

  useEffect(() => {
    const context = 'AppContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

  return (
    <AppGlobalsContext.Provider
      value={{
        queue,
        queueCurrent,
        serverGlobs,
        globBar,
      }}
    >
      {children}
    </AppGlobalsContext.Provider>
  );
}
