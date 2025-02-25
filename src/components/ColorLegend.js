import Stack from 'react-bootstrap/Stack';
import { useCount } from '../contexts/CountContext';
import ColorLabel from './ColorLabel';

export default function ColorLegend({ showCounts, header = 'Plenary Status' }) {
  const { getGridCount, colorKeys } = useCount();

  const keyToCount = (key) => {
    if (1) return null; // hide all counts for now
    const count = getGridCount(key);
    if (!showCounts || !count) return null;
    return '(' + count + ')';
  };

  return (
    <div className="ColorLegend">
      <div className="underline bigger-font">{header}</div>
      <Stack className="mt-1" direction="vertical" gap={1}>
        {colorKeys.map((key) => {
          const count = keyToCount(key);
          return (
            <ColorLabel key={key} rectClass={key} label={key} extra={count} />
          );
        })}
      </Stack>
    </div>
  );
}
