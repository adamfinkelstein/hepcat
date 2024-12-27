import Stack from 'react-bootstrap/Stack';
import { useAppGlobals } from '../contexts/AppContext';
import { useGrid } from '../contexts/GridContext';
import ColorLegend from './ColorLegend';
import GridBlock from './GridBlock.js';
import GridModeDropdown from './GridModeDropdown.js';
import GridProgressBar from './GridProgressBar.js';
import SetSticky from './SetSticky.js';

export default function GridTab() {
  const { guiBar } = useAppGlobals();
  const { grid } = useGrid();
  const pTotal = grid?.counts?.total || 0;
  const gridNidsAbove = grid?.nidsAbove ? grid.nidsAbove : [];
  const gridNidsBelow = grid?.nidsBelow ? grid.nidsBelow : [];
  const gridCountAbove = gridNidsAbove.length;
  const gridCountBelow = gridNidsBelow.length;
  const pUnconflicted = gridCountAbove + gridCountBelow;
  const pConflicted = pTotal - pUnconflicted;

  return (
    <Stack direction="vertical" gap={3} className="GridTab ms-2">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div>
          Bar:&nbsp;{guiBar}
          &nbsp; Above:&nbsp;{gridCountAbove}
          &nbsp; Below:&nbsp;{gridCountBelow}
          &nbsp; Conflicts:&nbsp;{pConflicted}
          &nbsp; Total:&nbsp;{pTotal}
        </div>
        <GridModeDropdown />
      </Stack>

      <GridBlock nidList={gridNidsAbove} />
      <hr className="horizontal-divider" />
      <GridBlock nidList={gridNidsBelow} />

      {pUnconflicted > 0 && <GridProgressBar counts={grid.counts} />}
      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorLegend gridCounts={grid?.counts} />
        <div className="vr" />
        <SetSticky />
      </Stack>
    </Stack>
  );
}
