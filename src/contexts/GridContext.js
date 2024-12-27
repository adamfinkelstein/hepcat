import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useUser } from './UserContext';
import { useKey } from './KeyContext';

const gridContext = createContext();

const getBasicCountsInGrid = (gridData) => {
  const counts = {};
  const total = gridData.papers_encrypted.length;
  const above = gridData.nidsAbove.length;
  const below = gridData.nidsBelow.length;
  const unconflicted = above + below;
  const conflicted = total - unconflicted;
  counts.total = total;
  counts.above = above;
  counts.below = below;
  counts.unconflicted = unconflicted;
  counts.conflicted = conflicted;
  return counts;
};

const countPaperStatusInGrid = (gridData) => {
  const convergedStatuses = ['Journal', 'Conference', 'Reject'];
  const papers = gridData.papers;
  const counts = getBasicCountsInGrid(gridData);
  let converged = 0;
  let pending = 0;
  let tabledStickyCount = 0;
  for (const nid in papers) {
    const paper = papers[nid];
    const status = paper.status;
    if (convergedStatuses.includes(status)) {
      converged++;
    } else {
      pending++;
    }
    // Tabled-Sticky is a special case
    if (paper.tabled_sticky) {
      tabledStickyCount++;
    } // prevent double counting as Tabled
    else if (status in counts) {
      counts[status]++;
    } else {
      counts[status] = 1;
    }
  }
  counts['Converged'] = converged;
  counts['Pending'] = pending;
  counts['Tabled-Sticky'] = tabledStickyCount;
  gridData.counts = counts;
};

export default function GridContext({ children }) {
  const { socket, socketEmit } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { roomChoice } = useUser();
  const { decryptObjectOrNull } = useKey();

  const [grid, setGrid] = useState(null);
  const [gridMode, setGridMode] = useState('Normal');

  const sortGridPapers = useCallback(
    (data) => {
      const nidsAbove = [];
      const nidsBelow = [];
      for (const nid of data.nidsInOrder) {
        const p = data.papers[nid];
        if (gridMode === 'This Room' && p.paper_room !== roomChoice) continue; // skip papers for other rooms?
        if (p.below_bar) {
          nidsBelow.push(nid);
        } else {
          nidsAbove.push(nid);
        }
      }
      data.nidsAbove = nidsAbove;
      data.nidsBelow = nidsBelow;
    },
    [gridMode, roomChoice],
  );

  const forceGridUpdate = useCallback(
    (data) => {
      const newGrid = { ...data };
      sortGridPapers(newGrid);
      countPaperStatusInGrid(newGrid);
      setGrid(newGrid); // force update to grid variable
    },
    [setGrid, sortGridPapers],
  );

  const updateGridEntry = useCallback(
    (grid_update) => {
      const nid = grid_update.nid;
      if (!nid || !grid || !grid.papers) {
        controlledLog('*** cannot find grid entry for nid:', nid);
        return;
      }
      grid.papers[nid] = grid_update;
      forceGridUpdate(grid);
    },
    [grid, forceGridUpdate, controlledLog],
  );

  useEffect(() => {
    const decodeGridPapers = (data) => {
      const papers = {}; // dictionary indexed by nid
      const nidsInOrder = [];
      const enc = data.papers_encrypted;
      for (let i = 0; i < enc.length; i++) {
        const p = decryptObjectOrNull(enc[i]);
        if (!p) continue; // skip conflicted papers
        papers[p.nid] = p;
        nidsInOrder.push(p.nid);
      }
      data.papers = papers;
      data.nidsInOrder = nidsInOrder;
    };

    const receiveGrid = (data) => {
      decodeGridPapers(data);
      forceGridUpdate(data);
      controlledLog('received and decoded grid:');
      controlledLog(data);
    };

    const receiveSticky = (encrypted_grid_update) => {
      const grid_update = decryptObjectOrNull(encrypted_grid_update);
      if (!grid_update) {
        controlledLog('received sticky for conflicted paper (ignored)');
        return;
      }
      controlledLog('received sticky grid update: ' + grid_update);
      updateGridEntry(grid_update);
    };

    if (socket && 'on' in socket) {
      controlledLog('register socket handlers in GridContext');
      socket.on('server_set_grid', receiveGrid);
      socket.on('server_set_sticky', receiveSticky);
    }

    // return from useEffect is function that does cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers in GridContext');
        socket.off('server_set_grid', receiveGrid);
        socket.off('server_set_sticky', receiveSticky);
      }
    };
  }, [
    grid,
    socket,
    gridMode,
    controlledLog,
    roomChoice,
    socketEmit,
    decryptObjectOrNull,
    forceGridUpdate,
    updateGridEntry,
  ]);

  function checkValidNID(nid) {
    if (!grid || !grid.papers) return false;
    return nid in grid.papers;
  }

  return (
    <gridContext.Provider
      value={{
        grid,
        gridMode,
        setGridMode,
        checkValidNID,
        updateGridEntry,
      }}
    >
      {children}
    </gridContext.Provider>
  );
}

export function useGrid() {
  return useContext(gridContext);
}
