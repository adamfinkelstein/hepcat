// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useEffect, useCallback } from 'react';
import { useSocketHandler } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';
import { useUser } from './UserContext';
import { useKey } from './KeyContext';
import { useSticky } from '../contexts/StickyContext';

const gridContext = React.createContext();

export default function GridContext({ children }) {
  const { controlledLog } = useControlledLog();
  const { roomChoice } = useUser();
  const { decryptThenHandleObj, decryptThenHandleArray } = useKey();
  const { checkStickyIdIsValid } = useSticky();

  const [gridBar, setGridBar] = useState('');
  const [gridMode, setGridMode] = useState('Normal');
  const [gridInRoom, setGridInRoom] = useState(false);
  const [gridPapers, setGridPapers] = useState({});
  const [gridNidsInOrder, setGridNidsInOrder] = useState([]);
  const [gridNidsAbove, setGridNidsAbove] = useState([]);
  const [gridNidsBelow, setGridNidsBelow] = useState([]);
  const [gridConflicts, setGridConflicts] = useState(0);

  const gridNidIsValid = useCallback(
    (nid) => !!gridPapers?.[nid],
    [gridPapers]
  );

  const gridGetElemByNid = useCallback(
    (nid) => {
      if (!gridNidIsValid(nid)) return null;
      return gridPapers[nid];
    },
    [gridPapers, gridNidIsValid]
  );

  const sortGridPapers = useCallback(
    (papers, nidsInOrder) => {
      const above = [];
      const below = [];
      for (const nid of nidsInOrder) {
        const p = papers?.[nid];
        if (!p) continue; // sanity check -- should not happen
        // if in room, skip papers for other rooms
        if (gridInRoom && p.paper_room !== roomChoice) continue;
        if (p.below_bar) {
          below.push(nid);
        } else {
          above.push(nid);
        }
      }
      return { above, below };
    },
    [gridInRoom, roomChoice]
  );

  // called due to sticky or queue update
  const updateGridEntry = useCallback(
    (grid_update) => {
      const nid = grid_update.nid;
      const idx = grid_update.idx;
      checkStickyIdIsValid(nid, idx);
      if (!nid || !gridPapers?.[nid]) return;
      setGridPapers((prevGridPapers) => ({
        ...prevGridPapers,
        [nid]: grid_update,
      }));
    },
    [gridPapers, checkStickyIdIsValid]
  );

  const updateGridPapers = useCallback(
    (arr) => {
      const valid = arr.filter(Boolean); // omit null (conflicts)
      const nConflicts = arr.length - valid.length;
      const nidsInOrder = [];
      const papers = {}; // dictionary indexed by nid
      for (const p of valid) {
        const nid = p.nid;
        const idx = p.idx;
        nidsInOrder.push(nid);
        papers[nid] = p;
        checkStickyIdIsValid(nid, idx);
      }
      setGridConflicts(nConflicts);
      setGridNidsInOrder(nidsInOrder);
      setGridPapers(papers);
    },
    [checkStickyIdIsValid]
  );

  const decryptGridPapers = useCallback(
    (encryptedPapers) => {
      decryptThenHandleArray(encryptedPapers, updateGridPapers);
    },
    [decryptThenHandleArray, updateGridPapers]
  );

  useEffect(() => {
    const inRoom = gridMode === 'This Room';
    setGridInRoom(inRoom);
  }, [gridMode]);

  // sort grid papers into above and below.
  // this happens whenever grid data changes.
  // also happens when grid mode changes because of sortGridPapers.
  useEffect(() => {
    const { above, below } = sortGridPapers(gridPapers, gridNidsInOrder);
    setGridNidsAbove(above);
    setGridNidsBelow(below);
  }, [gridPapers, gridNidsInOrder, sortGridPapers]);

  const receiveGrid = useCallback(
    (data) => {
      const barNum = data.bar;
      const barStr = barNum.toString();
      setGridBar(barStr);
      decryptGridPapers(data.papers_encrypted);
      controlledLog('received and decoded grid data and bar: ' + barStr);
    },
    [controlledLog, decryptGridPapers]
  );

  const receiveSticky = useCallback(
    (encrypted_grid_update) => {
      decryptThenHandleObj(encrypted_grid_update, updateGridEntry);
    },
    [decryptThenHandleObj, updateGridEntry]
  );

  // register socket event handlers
  const ctx = 'GridContext';
  useSocketHandler('server_set_grid', receiveGrid, ctx);
  useSocketHandler('server_set_sticky', receiveSticky, ctx);

  return (
    <gridContext.Provider
      value={{
        gridBar,
        gridMode,
        setGridMode,
        gridInRoom,
        gridPapers,
        gridNidsAbove,
        gridNidsBelow,
        gridConflicts,
        gridNidIsValid,
        gridGetElemByNid,
        updateGridEntry,
      }}
    >
      {children}
    </gridContext.Provider>
  );
}

export function useGrid() {
  return React.useContext(gridContext);
}
