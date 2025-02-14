import Stack from 'react-bootstrap/Stack';
import { useAppGlobals } from '../contexts/AppContext';
import { useGrid } from '../contexts/GridContext';
import { useCount } from '../contexts/CountContext';
import ColorLegend from './ColorLegend';
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
  const { appBar } = useAppGlobals();
  const { gridNidsAbove, gridNidsBelow, gridInRoom } = useGrid();
  const { getGridCount } = useCount();
  const nTotal = getGridCount('total');
  const nAbove = getGridCount('above');
  const nBelow = getGridCount('below');
  const nConflict = getGridCount('Conflict');
  const showProgress = nAbove + nBelow > 0;

  return (
    <Stack direction="vertical" gap={3} className="GridTab ms-2">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div>
          <CountSpan label="Bar" count={appBar} />
          <CountSpan label="Above" count={nAbove} />
          <CountSpan label="Below" count={nBelow} />
          {!gridInRoom && <CountSpan label="Conflict" count={nConflict} />}
          <CountSpan label="Total" count={nTotal} />
        </div>
        <GridModeDropdown />
      </Stack>

      <GridBlock nidList={gridNidsAbove} />
      <hr className="horizontal-divider" />
      <GridBlock nidList={gridNidsBelow} />

      {showProgress > 0 && <GridProgressBar />}
      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorLegend showCounts={true} />
        <div className="vr" />
        <SetSticky />
      </Stack>
    </Stack>
  );
}
