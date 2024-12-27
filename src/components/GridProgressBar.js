import Stack from 'react-bootstrap/Stack';
import ProgressBar from 'react-bootstrap/ProgressBar';

export default function GridProgressBar({ counts }) {
  const getCount = (status) => {
    if (status === 'Conflict') return counts.conflicted;
    if (!counts.unconflicted || !counts?.hasOwnProperty(status)) return 0;
    const count = counts[status];
    return count;
  };

  const countToPercent = (count) => {
    const percent = (count / counts.total) * 100;
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

  let progressBars = [
    'Journal',
    'Conference',
    'Reject',
    'Tabled-Sticky',
    'Tabled',
    'Unseen',
  ];
  if (counts.conflicted > 0) progressBars.push('Conflict');

  return (
    <Stack direction="vertical" className="my-0 GridProgressBar" gap={1}>
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
        {counts.conflicted > 0 && (
          <>
            <div>+</div>
            <div>Conflicts: {getCounts('Conflict')}</div>
          </>
        )}
        <div className="unconflicted-count">= Total: {counts.total}</div>
      </Stack>
      <hr className="horizontal-divider" />
    </Stack>
  );
}
