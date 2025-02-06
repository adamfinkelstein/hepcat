import Stack from 'react-bootstrap/Stack';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useCount } from '../contexts/CountContext';

export default function GridProgressBar() {
  const { getGridCount } = useCount();

  const countToPercent = (count) => {
    const total = getGridCount('total');
    if (total === 0) return 0;
    const percent = (count / total) * 100;
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
    const count = getGridCount(status);
    const floatPercent = countToPercent(count);
    const percent = fmtPercent(floatPercent);
    const fmt = `${count} (${percent})`;
    return fmt;
  };

  let progressBars = [
    'Journal',
    'Conference',
    'Reject',
    'Tabled-Sticky',
    'Tabled',
    'Unseen',
  ];
  const conflictCount = getGridCount('Conflict');
  if (conflictCount) progressBars.push('Conflict');

  return (
    <Stack direction="vertical" className="my-0 GridProgressBar" gap={1}>
      <hr className="horizontal-divider" />
      <ProgressBar className="grid-item grid-progress-bar me-3">
        {progressBars.map((status) => {
          const className = 'grid-item ' + status;
          const count = getGridCount(status);
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
        {conflictCount && (
          <>
            <div>+</div>
            <div>Conflicts: {conflictCount}</div>
          </>
        )}
        <div className="total-count">= Total: {getCounts('total')}</div>
      </Stack>
      <hr className="horizontal-divider" />
    </Stack>
  );
}
