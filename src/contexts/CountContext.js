import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useControlledLog } from './ControlledLogContext.js';
import { useGrid } from './GridContext';

const getBasicCountsInGrid = (inRoom, conf, nidsAbove, nidsBelow) => {
  const counts = {};
  const above = nidsAbove.length;
  const below = nidsBelow.length;
  const unconflicted = above + below;
  if (inRoom) {
    counts.Conflict = 0;
    counts.total = unconflicted;
  } else {
    counts.Conflict = conf;
    counts.total = unconflicted + conf;
  }
  counts.above = above;
  counts.below = below;
  return counts;
};

const getCountsInGrid = (inRoom, conf, papers, nidsAbove, nidsBelow) => {
  const convergedStatuses = ['Journal', 'Conference', 'Reject'];
  const otherStatuses = ['Ready', 'Tabled', 'Tabled-Sticky'];
  const allStatuses = [...convergedStatuses, ...otherStatuses];
  const allInGrid = [...nidsAbove, ...nidsBelow];
  const counts = getBasicCountsInGrid(inRoom, conf, nidsAbove, nidsBelow);
  let converged = 0;
  let pending = 0;
  let tabledStickyCount = 0;
  for (const status of allStatuses) {
    counts[status] = 0;
  }
  for (const nid of allInGrid) {
    if (!papers.hasOwnProperty(nid)) {
      // this should not happen, and is just here for a sanity check.
      // console.log('*** cannot find grid entry for nid:', nid);
      // possible when transitioning between users, grid conflicts change,
      // and there is some kind of race condition.
      continue;
    }
    const paper = papers[nid];
    const status = paper.status;
    if (convergedStatuses.includes(status)) {
      converged++;
    } else {
      pending++;
    }
    if (status in counts) {
      counts[status]++;
    } else {
      counts[status] = 1;
    }
  }
  counts['Converged'] = converged;
  counts['Pending'] = pending;
  return counts;
};

const defaultCounts = getCountsInGrid(false, 0, {}, [], []);

const countContext = createContext();

export default function CountContext({ children }) {
  const { controlledLog } = useControlledLog();
  const {
    gridPapers,
    gridNidsAbove,
    gridNidsBelow,
    gridInRoom,
    gridConflicts,
  } = useGrid();
  const [gridCounts, setGridCounts] = useState(defaultCounts);

  useEffect(() => {
    const counts = getCountsInGrid(
      gridInRoom,
      gridConflicts,
      gridPapers,
      gridNidsAbove,
      gridNidsBelow,
    );
    setGridCounts(counts);
  }, [
    gridInRoom,
    gridPapers,
    gridConflicts,
    gridNidsAbove,
    gridNidsBelow,
    setGridCounts,
    controlledLog,
  ]);

  const getGridCount = useCallback(
    (field) => {
      if (gridCounts?.hasOwnProperty(field)) {
        return gridCounts[field];
      } else {
        return 0;
      }
    },
    [gridCounts],
  );

  return (
    <countContext.Provider
      value={{
        gridCounts,
        getGridCount,
      }}
    >
      {children}
    </countContext.Provider>
  );
}

export function useCount() {
  return useContext(countContext);
}
