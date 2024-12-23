import Stack from 'react-bootstrap/Stack';
import { useColors } from '../contexts/PreferencesContext';
import ColorLabel from './ColorLabel';

export default function ColorLegend({ gridCounts, header = 'Plenary Status' }) {
  const colors = useColors();
  const colorKeys = Object.keys(colors);
  const keyToCount = (key) => {
    if (!gridCounts || !gridCounts.hasOwnProperty(key)) return null;
    const count = gridCounts[key];
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
