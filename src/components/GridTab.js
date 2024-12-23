import Stack from 'react-bootstrap/Stack';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useState } from 'react';
import { useAppGlobals } from '../contexts/AppContext';
import ColorLegend from './ColorLegend';
import Grid from './Grid.js';
import SetSticky from './SetSticky.js';

export default function GridTab() {
  const [gridDisplay, setGridDisplay] = useState('Normal');
  const { guiBar, grid } = useAppGlobals();
  const gridCountAbove = grid?.above_oids ? grid.above_oids.length : 0;
  const gridCountBelow = grid?.below_oids ? grid.below_oids.length : 0;
  const gridNidsAbove = grid?.above_nids ? grid.above_nids.length : 0;
  const gridNidsBelow = grid?.below_nids ? grid.below_nids.length : 0;
  const pTotal = gridCountAbove + gridCountBelow;
  const pUnconflicted = gridNidsAbove + gridNidsBelow;
  const pConflicted = pTotal - pUnconflicted;

  const getCount = (status) => {
    if (status === 'Conflict') return pConflicted;
    if (!pUnconflicted || !grid?.counts || !grid.counts.hasOwnProperty(status))
      return 0;
    const count = grid.counts[status];
    return count;
  };

  const countToPercent = (count) => {
    const percent = (count / pTotal) * 100;
    return percent;
  };

  const fmtPercent = (floatPercent) => {
    const intPercent = Math.round(floatPercent);
    return intPercent + '%';
  };

  const showCountAndPercent = (count, floatPercent) => {
    if (floatPercent < 5) return '';
    if (floatPercent < 10) return '' + count;
    return count + ' (' + fmtPercent(floatPercent) + ')';
  };

  const getCounts = (status) => {
    const count = getCount(status);
    const floatPercent = countToPercent(count);
    const percent = fmtPercent(floatPercent);
    const fmt = `${count} (${percent})`;
    return fmt;
  };

  const gridModes = ['Normal', 'Stickies', 'Favorites'];
  let progressBars = [
    'Journal',
    'Conference',
    'Reject',
    'Tabled-Sticky',
    'Tabled',
    'Unseen',
  ];
  if (pConflicted > 0) progressBars.push('Conflict');

  return (
    <Stack direction="vertical" gap={3} className="GridTab ms-2">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div>
          Bar:&nbsp;{guiBar}
          &nbsp; Above:&nbsp;{gridNidsAbove}
          &nbsp; Below:&nbsp;{gridNidsBelow}
          &nbsp; Conflicts:&nbsp;{pConflicted}
          &nbsp; Total:&nbsp;{pTotal}
        </div>
        <DropdownButton
          title={gridDisplay}
          variant="secondary"
          className="grid-display-dropdown me-3"
        >
          {gridModes.map((gridDisplay) => {
            return (
              <Dropdown.Item
                key={gridDisplay}
                as="button"
                onClick={() => setGridDisplay(gridDisplay)}
              >
                {gridDisplay}
              </Dropdown.Item>
            );
          })}
        </DropdownButton>
      </Stack>

      <Grid isAbove gridDisplay={gridDisplay} />
      <hr className="horizontal-divider" />
      <Grid gridDisplay={gridDisplay} />

      {pUnconflicted > 0 && (
        <Stack direction="vertical" className="my-0" gap={1}>
          <hr className="horizontal-divider" />
          <ProgressBar className="grid-item grid-progress-bar me-3">
            {progressBars.map((status) => {
              const className = 'grid-item ' + status;
              const count = getCount(status);
              const floatPercent = countToPercent(count);
              const showPercent = showCountAndPercent(count, floatPercent);
              return (
                <ProgressBar
                  key={status}
                  now={floatPercent}
                  label={showPercent}
                  className={className}
                />
              );
            })}
          </ProgressBar>

          <Stack direction="horizontal" className="my-0 me-3" gap={3}>
            <div>Converged: {getCounts('Converged')}</div>
            <div>+</div>
            <div>Pending: {getCounts('Pending')}</div>
            {pConflicted > 0 && (
              <>
                <div>+</div>
                <div>Conflict: {getCounts('Conflict')}</div>
              </>
            )}
            <div className="unconflicted-count">= Total: {pTotal}</div>
          </Stack>
          <hr className="horizontal-divider" />
        </Stack>
      )}
      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorLegend gridCounts={grid?.counts} />
        <div className="vr" />
        <SetSticky />
      </Stack>
    </Stack>
  );
}
