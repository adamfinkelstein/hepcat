import Stack from 'react-bootstrap/Stack';
import { useColors } from '../contexts/PreferencesContext';
import { useCount } from '../contexts/CountContext';
import ColorLabel from './ColorLabel';

export default function ColorLegend({ showCounts, header = 'Plenary Status' }) {
  const { getGridCount } = useCount();
  const colors = useColors();
  const colorKeys = Object.keys(colors);
  const keyToCount = (key) => {
    const count = getGridCount(key);
    if (!showCounts || !count) return null;
    return '(' + count + ')';
  };
  const mapReady = (key) => {
    return key === 'Ready' ? 'Ready/bbs' : key;
  };

  return (
    <div className="ColorLegend">
      <div className="underline bigger-font">{header}</div>
      <Stack className="mt-1" direction="vertical" gap={1}>
        {colorKeys.map((key) => {
          const count = keyToCount(key);
          const label = mapReady(key);
          return (
            <ColorLabel key={key} rectClass={key} label={label} extra={count} />
          );
        })}
      </Stack>
    </div>
  );
}
