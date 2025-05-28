import Stack from 'react-bootstrap/Stack';
import { useCount } from '../contexts/CountContext';
import { useUser } from '../contexts/UserContext';
import ColorLabel from './ColorLabel';

export default function ColorLegend({
  showCounts,
  header = null,
  selectedColorKey = null,
  setSelectedColorKey = null,
}) {
  const { getGridCount, colorKeys } = useCount();
  const { user } = useUser();

  const keyToCount = (key) => {
    if (!user || !user.role_is_admin) return null; // hide all counts for now
    const count = getGridCount(key);
    if (!showCounts || !count) return null;
    return '(' + count + ')';
  };

  const keyToLabelClass = (key) => {
    if (!selectedColorKey) return '';
    if (selectedColorKey === key) return 'selected-color';
    return 'unselected-color';
  };

  const handleLabelClick = (key) => {
    if (setSelectedColorKey) {
      setSelectedColorKey(key);
    }
  };

  return (
    <div className="ColorLegend">
      {header && <div className="underline bigger-font">{header}</div>}
      <Stack className="mt-1" direction="vertical" gap={1}>
        {colorKeys.map((key) => {
          const count = keyToCount(key);
          const labelClass = keyToLabelClass(key);
          return (
            <ColorLabel
              key={key}
              labelClass={labelClass}
              rectClass={key}
              label={key}
              extra={count}
              clickHandler={() => handleLabelClick(key)}
            />
          );
        })}
      </Stack>
    </div>
  );
}
