import Stack from 'react-bootstrap/Stack';
import { useGrid } from '../contexts/GridContext';
import { useCount } from '../contexts/CountContext';
import { useUser } from '../contexts/UserContext';
import ColorLegend from './ColorLegend';
import GridBar from './GridBar';
import GridBlock from './GridBlock';
import GridModeDropdown from './GridModeDropdown';
import GridProgressBar from './GridProgressBar';
import SetSticky from './SetSticky';

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
  const { roomChoice } = useUser();
  const nTotal = getGridCount('total');
  const nConflict = getGridCount('Conflict');
  const nonConflict = nTotal - nConflict;
  const showProgress = nonConflict > 0;
  const showGrid = gridNidsAbove.length + gridNidsBelow.length > 0;
  const noPapInRoom = '(No papers assigned to ' + roomChoice + '.)';
  const noGridMsg = gridInRoom ? noPapInRoom : '(No papers in grid.)';

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
      {showGrid ? <GridBar /> : <div className="grid-message">{noGridMsg}</div>}
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
