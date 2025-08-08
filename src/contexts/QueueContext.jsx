// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

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
  const { user, isAdmin, roomChoice, isScreenOrOutside } = useUser();
  const { socketEmit } = useSocketIO();
  const { decryptThenHandleArray, decryptThenHandleObj } = useKey();
  const { updateGridEntry } = useGrid();
  const { resetProbeMsgs, recordAdminGlobs } = useAdmin();
  const { flash } = useFlasher();
  const [queue, setQueue] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [isCurrentPaper, setIsCurrentPaper] = useState(false);
  const [roomGlobs, setRoomGlobs] = useState(null);
  const isScreen = isScreenOrOutside();

  // When queue or queueCurrent changes, track if there is a current paper.
  useEffect(() => {
    const isPaper =
      queue?.length && queueCurrent < queue.length && queueCurrent >= 0;
    setIsCurrentPaper(isPaper);
  }, [queue, queueCurrent]);

  // When room choice changes, request new queue.
  // (Only after welcome when user is set.)
  useEffect(() => {
    if (user) socketEmit('user_request_queue', roomChoice);
  }, [user, roomChoice, socketEmit]);

  const updateQueueEntry = useCallback((q_index, status) => {
    setQueue((prevQueue) => {
      // Sanity check on bounds
      if (q_index < 0 || q_index >= prevQueue.length) return prevQueue;
      // Create new array with updated entry
      const newQueue = [...prevQueue];
      newQueue[q_index].status = status;
      return newQueue;
    });
  }, []);

  const handleQAndGridStatusUpdate = useCallback(
    (update) => {
      controlledLog('decrypted globs update:', update);
      const isTheRoom = update.room === roomChoice;
      updateGridEntry(update.grid_update);
      if (!isTheRoom) return;
      const index = update.queue_index;
      const status = update.status;
      updateQueueEntry(index, status);
      if (isScreen) return; // NO flash updates on screen or outside
      const nid = update.nid;
      const msg = `Update: Q${index + 1} (${nid}) is ${status}.`;
      flash(msg, 'info', 3);
    },
    [
      isScreen,
      controlledLog,
      roomChoice,
      flash,
      updateGridEntry,
      updateQueueEntry,
    ]
  );

  const replaceConflictsAndSetQueue = useCallback((arr) => {
    const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
    const afterCleanup = arr.map((p) => {
      return p ? p : dummy; // replace null (conflict) w dummy
    });
    setQueue(afterCleanup);
  }, []);

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
          // first time call this without potential decrypt
          recordAdminGlobs(data.globs);
          const status_enc = data.globs.current_status_enc;
          if (status_enc) {
            decryptThenHandleObj(status_enc, (decrypted_status) => {
              console.log('call recordAdminGlobs with: ' + decrypted_status);
              data.globs.current_status = decrypted_status;
              // second time call it including successful current_status
              recordAdminGlobs(data.globs);
            });
          }
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
        isCurrentPaper,
        roomGlobs,
      }}
    >
      {children}
    </queueContext.Provider>
  );
}
