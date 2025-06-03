import React, { useState, useEffect, useCallback } from 'react';
import { useSocketIO } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';
import { useUser } from './UserContext';
import { useKey } from './KeyContext';
import { useSticky } from '../contexts/StickyContext';

const gridContext = React.createContext();

export default function GridContext({ children }) {
  const { registerIoHandlers } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { roomChoice } = useUser();
  const { decryptObjectOrNull } = useKey();
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
    (nid) => {
      return Object.hasOwn(gridPapers, nid);
    },
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
        if (!Object.hasOwn(papers, nid)) {
          // this should not happen, and is just here for a sanity check.
          controlledLog('*** cannot find grid entry for nid:', nid);
          continue;
        }
        const p = papers[nid];
        if (gridInRoom && p.paper_room !== roomChoice) continue; // skip papers for other rooms?
        if (p.below_bar) {
          below.push(nid);
        } else {
          above.push(nid);
        }
      }
      return { above, below };
    },
    [gridInRoom, roomChoice, controlledLog]
  );

  // called due to sticky or queue update
  const updateGridEntry = useCallback(
    (grid_update) => {
      const nid = grid_update.nid;
      const idx = grid_update.idx;
      checkStickyIdIsValid(nid, idx);
      if (!nid || !Object.hasOwn(gridPapers, nid)) return;
      const newGridPapers = { ...gridPapers };
      newGridPapers[nid] = grid_update;
      setGridPapers(newGridPapers); // force update to papers variable
    },
    [gridPapers, setGridPapers, checkStickyIdIsValid]
  );

  const decryptGridPapers = useCallback(
    (encryptedPapers) => {
      const papers = {}; // dictionary indexed by nid
      const nidsInOrder = [];
      const nEnc = encryptedPapers.length;
      let nConflicts = 0;
      for (let i = 0; i < nEnc; i++) {
        const paperEnc = encryptedPapers[i];
        const p = decryptObjectOrNull(paperEnc);
        if (!p) {
          nConflicts++;
          continue; // skip conflicted papers
        }
        const nid = p.nid;
        const idx = p.idx;
        papers[nid] = p;
        nidsInOrder.push(nid);
        checkStickyIdIsValid(nid, idx);
      }
      setGridConflicts(nConflicts);
      setGridNidsInOrder(nidsInOrder);
      setGridPapers(papers);
      // controlledLog('grid papers decrypted: ', papers);
    },
    [
      decryptObjectOrNull,
      setGridPapers,
      setGridNidsInOrder,
      setGridConflicts,
      checkStickyIdIsValid,
      // controlledLog,
    ]
  );

  useEffect(() => {
    const inRoom = gridMode === 'This Room';
    setGridInRoom(inRoom);
  }, [gridMode, setGridInRoom]);

  // sort grid papers into above and below.
  // this happens whenever grid changes.
  // also happens when grid mode changes because of sortGridPapers.
  useEffect(() => {
    const { above, below } = sortGridPapers(gridPapers, gridNidsInOrder);
    setGridNidsAbove(above);
    setGridNidsBelow(below);
  }, [
    gridPapers,
    gridNidsInOrder,
    sortGridPapers,
    setGridNidsAbove,
    setGridNidsBelow,
  ]);

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
      const grid_update = decryptObjectOrNull(encrypted_grid_update);
      if (!grid_update) {
        controlledLog('received sticky for conflicted paper (ignored)');
        return;
      }
      controlledLog('received sticky grid update: ', grid_update);
      updateGridEntry(grid_update);
    },
    [controlledLog, decryptObjectOrNull, updateGridEntry]
  );

  const getHandlers = useCallback(() => {
    return {
      server_set_grid: receiveGrid,
      server_set_sticky: receiveSticky,
    };
  }, [receiveGrid, receiveSticky]);

  useEffect(() => {
    const context = 'GridContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

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
