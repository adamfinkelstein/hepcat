import React, { useState, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';
import { useFlasher } from './FlasherContext';
import { useUser } from './UserContext';
import { useKey } from './KeyContext';
import { useGrid } from './GridContext';
import { useAdmin } from './AdminContext';

const queueContext = React.createContext();

export function useQueue() {
  return React.useContext(queueContext);
}

export default function QueueContext({ children }) {
  const { controlledLog, setShowLogs } = useControlledLog();
  const { isAdmin, roomChoice } = useUser();
  const { socketEmit, registerIoHandlers } = useSocketIO();
  const { decryptThenHandleArray, decryptThenHandleObj } = useKey();
  const { updateGridEntry } = useGrid();
  const { resetProbeMsgs, recordAdminGlobs } = useAdmin();
  const { flash } = useFlasher();
  const [queue, setQueue] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [roomGlobs, setRoomGlobs] = useState(null);

  // When room choice changes, emit request to server.
  useEffect(() => {
    controlledLog('roomChoice is now ' + roomChoice);
    socketEmit('user_request_queue', roomChoice);
  }, [roomChoice, controlledLog, socketEmit]);

  const recordRoomGlobs = useCallback(
    (data) => {
      controlledLog('recordRoomGlobs:', data);
      if ('showAppLogs' in data) {
        // could be true or false or not exist
        setShowLogs(data.showAppLogs);
      }
      if (isAdmin) {
        recordAdminGlobs(data);
      }
      setRoomGlobs(data);
      const curr = data ? data.current : 0;
      setQueueCurrent(curr);
    },
    [
      controlledLog,
      isAdmin,
      setShowLogs,
      setRoomGlobs,
      setQueueCurrent,
      recordAdminGlobs,
    ]
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
    [controlledLog, queue, setQueue]
  );

  const handleGlobsUpdate = useCallback(
    (update) => {
      controlledLog('decrypted globs update:', update);
      const isTheRoom = update.room === roomChoice;
      updateGridEntry(update.grid_update);
      if (!isTheRoom) return;
      const index = update.queue_index;
      const status = update.status;
      const nid = update.nid;
      const msg = `Update: Q${index + 1} (${nid}) is ${status}.`;
      flash(msg, 'info', 3);
      updateQueueEntry(index, status);
    },
    [controlledLog, roomChoice, flash, updateGridEntry, updateQueueEntry]
  );

  // called on receiving data from either:
  //   server_set_queue or server_set_globs
  const receiveGlobs = useCallback(
    (data) => {
      controlledLog('received globs:', data);
      // if there was an update, it was encrypted, so get it...
      const isTheRoom = data.room === roomChoice;
      const encrypted = data.update_encrypted;
      if (isTheRoom) recordRoomGlobs(data);
      if (!encrypted) return;
      decryptThenHandleObj(encrypted, handleGlobsUpdate);
    },
    [
      controlledLog,
      roomChoice,
      recordRoomGlobs,
      handleGlobsUpdate,
      decryptThenHandleObj,
    ]
  );

  const safeSetQueue = useCallback(
    (arr) => {
      const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
      const safeQ = arr.map((p) => {
        return p ? p : dummy; // replace null (conflict) w dummy
      });
      setQueue(safeQ);
    },
    [setQueue]
  );

  const receiveQueue = useCallback(
    (data) => {
      controlledLog('received queue:', data);
      const encrypted = data.paper_list_encrypted;
      const globs = data.globs;
      const isTheRoom = globs.room === roomChoice;
      if (isTheRoom) {
        resetProbeMsgs();
        receiveGlobs(globs);
        decryptThenHandleArray(encrypted, safeSetQueue);
      }
    },
    [
      controlledLog,
      roomChoice,
      decryptThenHandleArray,
      safeSetQueue,
      receiveGlobs,
      resetProbeMsgs,
    ]
  );

  const getHandlers = useCallback(() => {
    return {
      server_set_queue: receiveQueue,
      server_set_globs: receiveGlobs,
    };
  }, [receiveQueue, receiveGlobs]);

  useEffect(() => {
    const context = 'QueueContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

  return (
    <queueContext.Provider
      value={{
        queue,
        queueCurrent,
        roomGlobs,
      }}
    >
      {children}
    </queueContext.Provider>
  );
}
