import Stack from 'react-bootstrap/Stack';
import { useGrid } from '../contexts/GridContext';
import { useCount } from '../contexts/CountContext';
import ColorLegend from './ColorLegend';
import GridBar from './GridBar.js';
import GridBlock from './GridBlock.js';
import GridModeDropdown from './GridModeDropdown.js';
import GridProgressBar from './GridProgressBar.js';
import SetSticky from './SetSticky.js';

function CountSpan({ label, count }) {
  return (
    <span>
      {label}:&nbsp;{count}&nbsp;&nbsp;
    </span>
  );
}

export default function GridTab() {
  const { gridNidsAbove, gridNidsBelow, gridInRoom } = useGrid();
  const { getGridCount } = useCount();
  const nTotal = getGridCount('total');
  const nConflict = getGridCount('Conflict');
  const nonConflict = nTotal - nConflict;
  const showProgress = nonConflict > 0;

  return (
    <Stack direction="vertical" gap={3} className="GridTab ms-2">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div>
          <CountSpan label="Total" count={nTotal} />
          {!gridInRoom && <CountSpan label="Conflict" count={nConflict} />}
        </div>
        <GridModeDropdown />
      </Stack>

      <GridBlock nidList={gridNidsAbove} />
      <GridBar />
      <GridBlock nidList={gridNidsBelow} />

      {showProgress > 0 && <GridProgressBar />}
      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorLegend header="Grid Status" showCounts={true} />
        <div className="vr" />
        <SetSticky />
      </Stack>
    </Stack>
  );
}
