// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
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

const allStatuses = [
  'Ready',
  'Tabled-Discuss',
  'Tabled',
  'Reject',
  'Conference',
  'Journal',
];
const colorKeys = [...allStatuses, 'Current', 'Conflict'];

const getCountsInGrid = (inRoom, conf, papers, nidsAbove, nidsBelow) => {
  const convergedStatuses = ['Journal', 'Conference', 'Reject'];
  const allInGrid = [...nidsAbove, ...nidsBelow];
  const counts = getBasicCountsInGrid(inRoom, conf, nidsAbove, nidsBelow);
  let converged = 0;
  let pending = 0;
  for (const status of allStatuses) {
    counts[status] = 0;
  }
  for (const nid of allInGrid) {
    const paper = papers?.[nid];
    if (!paper) continue; // sanity check in case of race condition
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

const countContext = React.createContext();

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
      gridNidsBelow
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
    (field) => gridCounts?.[field] || 0,
    [gridCounts]
  );

  return (
    <countContext.Provider
      value={{
        gridCounts,
        getGridCount,
        allStatuses,
        colorKeys,
      }}
    >
      {children}
    </countContext.Provider>
  );
}

export function useCount() {
  return React.useContext(countContext);
}
