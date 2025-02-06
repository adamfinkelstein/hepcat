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

export default function GridContext({ children }) {
  const { socket } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { roomChoice } = useUser();
  const { decryptObjectOrNull } = useKey();

  const [gridMode, setGridMode] = useState('Normal');
  const [gridInRoom, setGridInRoom] = useState(false);
  const [gridPapers, setGridPapers] = useState({});
  const [gridNidsInOrder, setGridNidsInOrder] = useState([]);
  const [gridNidsAbove, setGridNidsAbove] = useState([]);
  const [gridNidsBelow, setGridNidsBelow] = useState([]);
  const [gridConflicts, setGridConflicts] = useState(0);

  const gridNidIsValid = useCallback(
    (nid) => {
      return gridPapers.hasOwnProperty(nid);
    },
    [gridPapers],
  );

  const gridGetElemByNid = useCallback(
    (nid) => {
      if (!gridNidIsValid(nid)) return null;
      return gridPapers[nid];
    },
    [gridPapers, gridNidIsValid],
  );

  const sortGridPapers = useCallback(
    (papers, nidsInOrder) => {
      const above = [];
      const below = [];
      for (const nid of nidsInOrder) {
        if (!papers.hasOwnProperty(nid)) {
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
    [gridInRoom, roomChoice, controlledLog],
  );

  // called due to sticky or queue update
  const updateGridEntry = useCallback(
    (grid_update) => {
      const nid = grid_update.nid;
      if (!nid || !gridPapers.hasOwnProperty(nid)) {
        controlledLog('*** cannot find grid entry for nid:', nid);
        return;
      }
      const newGridPapers = { ...gridPapers };
      newGridPapers[nid] = grid_update;
      setGridPapers(newGridPapers); // force update to papers variable
    },
    [gridPapers, setGridPapers, controlledLog],
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
        papers[p.nid] = p;
        nidsInOrder.push(p.nid);
      }
      setGridConflicts(nConflicts);
      setGridNidsInOrder(nidsInOrder);
      setGridPapers(papers);
    },
    [decryptObjectOrNull, setGridPapers, setGridNidsInOrder, setGridConflicts],
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

  useEffect(() => {
    const receiveGrid = (data) => {
      decryptGridPapers(data.papers_encrypted);
      controlledLog('received and decoded grid data');
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
    socket,
    controlledLog,
    decryptObjectOrNull,
    updateGridEntry,
    decryptGridPapers,
  ]);

  return (
    <gridContext.Provider
      value={{
        gridMode,
        setGridMode,
        gridInRoom,
        gridPapers,
        gridNidsInOrder,
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
  return useContext(gridContext);
}
