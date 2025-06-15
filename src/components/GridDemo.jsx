// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Stack from 'react-bootstrap/Stack';
import { useCount } from '../contexts/CountContext';

function countingArray(n) {
  return Array.from({ length: n }, (_, i) => i + 10);
}

export default function GridBlock() {
  const { allStatuses } = useCount();
  const nStatus = allStatuses.length;
  const nidList = countingArray(45);

  function gridGetClasses(nid) {
    if (nid === 10) return 'grid-item Current';
    const index = nid % nStatus;
    const status = allStatuses[index];
    const className = 'grid-item ' + status;
    return className;
  }

  return (
    <Stack direction="vertical" gap={3} className="GridTab">
      <div className="underline bigger-font">Example Grid</div>
      <div className="GridDemo grid-container">
        {nidList.map((nid) => {
          return (
            <div key={nid} className={gridGetClasses(nid)}>
              <span>{nid}</span>
            </div>
          );
        })}
      </div>
    </Stack>
  );
}
