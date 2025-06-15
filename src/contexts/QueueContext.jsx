import React, { useState, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO, useSocketHandler } from './SocketIOContext';
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
  const { controlledLog } = useControlledLog();
  const { user, isAdmin, roomChoice } = useUser();
  const { socketEmit } = useSocketIO();
  const { decryptThenHandleArray, decryptThenHandleObj } = useKey();
  const { updateGridEntry } = useGrid();
  const { resetProbeMsgs, recordAdminGlobs } = useAdmin();
  const { flash } = useFlasher();
  const [queue, setQueue] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [roomGlobs, setRoomGlobs] = useState(null);

  // When room choice changes, request new queue.
  // (Only after welcome when user is set.)
  useEffect(() => {
    if (user) socketEmit('user_request_queue', roomChoice);
  }, [user, roomChoice, socketEmit]);

  const updateQueueEntry = useCallback(
    (q_index, status) => {
      setQueue((prevQueue) => {
        // Sanity check on bounds
        if (q_index < 0 || q_index >= prevQueue.length) return prevQueue;
        // Create new array with updated entry
        const newQueue = [...prevQueue];
        newQueue[q_index].status = status;
        return newQueue;
      });
    },
    [setQueue]
  );

  const handleQAndGridStatusUpdate = useCallback(
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

  const replaceConflictsAndSetQueue = useCallback(
    (arr) => {
      const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
      const afterCleanup = arr.map((p) => {
        return p ? p : dummy; // replace null (conflict) w dummy
      });
      setQueue(afterCleanup);
    },
    [setQueue]
  );

  const receiveQueue = useCallback(
    (data) => {
      controlledLog('received queue:', data);
      const update_paper = data.update_encrypted;
      decryptThenHandleObj(update_paper, handleQAndGridStatusUpdate);
      const isTheRoom = data.room === roomChoice;
      if (isTheRoom) {
        resetProbeMsgs();
        setRoomGlobs(data.globs);
        setQueueCurrent(data.globs.current);
        if (isAdmin) {
          recordAdminGlobs(data.globs);
        }
        const paper_list = data.paper_list_encrypted;
        decryptThenHandleArray(paper_list, replaceConflictsAndSetQueue);
      }
    },
    [
      isAdmin,
      recordAdminGlobs,
      controlledLog,
      roomChoice,
      decryptThenHandleObj,
      decryptThenHandleArray,
      handleQAndGridStatusUpdate,
      replaceConflictsAndSetQueue,
      resetProbeMsgs,
    ]
  );

  // register socket event handlers
  const ctx = 'QueueContext';
  useSocketHandler('server_set_queue', receiveQueue, ctx);

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
