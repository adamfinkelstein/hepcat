// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useGrid } from '../contexts/GridContext';
import { useCount } from '../contexts/CountContext';

export default function GridBar() {
  const { gridBar } = useGrid();
  const { getGridCount } = useCount();
  const nAbove = getGridCount('above');
  const nBelow = getGridCount('below');
  const barString = 'bar: ' + gridBar;

  return (
    <div className="GridBar">
      {nBelow} below
      <span className="barText">
        &nbsp;&lt;&nbsp;{barString}&nbsp;&le;&nbsp;
      </span>
      {nAbove} above
    </div>
  );
}
