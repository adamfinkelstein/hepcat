import Stack from 'react-bootstrap/Stack';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useCount } from '../contexts/CountContext';
import { useUser } from '../contexts/UserContext';

export default function GridProgressBar() {
  const { user } = useUser();
  const { getGridCount, allStatuses } = useCount();

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
    if (floatPercent < 1) return '';
    if (floatPercent < 10) return '' + count;
    return count + ' (' + fmtPercent(floatPercent) + ')';
  };

  const progressConverged = ['Journal', 'Conference', 'Reject'];

  const showLabel = (status) => {
    const converged = progressConverged.includes(status);
    return !converged || user?.role_is_admin;
  };

  const getCounts = (status) => {
    const count = getGridCount(status);
    const floatPercent = countToPercent(count);
    const percent = fmtPercent(floatPercent);
    const fmt = `${count} (${percent})`;
    return fmt;
  };

  const progressBars = [...allStatuses]; // copy and then reverse...
  progressBars.reverse();
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
          const label = showLabel(status) ? showPercent : '';
          return (
            <ProgressBar
              key={status}
              now={floatPercent}
              label={label}
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
