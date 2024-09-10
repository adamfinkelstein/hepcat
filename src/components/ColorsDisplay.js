import Stack from 'react-bootstrap/Stack';
import { useColors } from '../contexts/PreferencesContext';
// import { click } from '@testing-library/user-event/dist/click';

export default function ColorsDisplay({
  clickable,
  selectedColorKey,
  setSelectedColorKey,
  gridCounts,
}) {
  const colors = useColors();
  const colorKeys = Object.keys(colors);
  const addCountToKey = (key) => {
    if (!gridCounts || !gridCounts.hasOwnProperty(key)) return key;
    const count = gridCounts[key];
    return key + ' (' + count + ')';
  };

  return (
    <div className="ColorsDisplay">
      <div className="col-head font-size-3">Plenary Status</div>
      <ul>
        {colorKeys.map((key) => {
          const className = 'legend-container';
          return (
            <li
              key={key}
              className={className}
              onClick={() => {
                if (clickable) {
                  setSelectedColorKey(key);
                }
              }}
            >
              <Stack
                direction="horizontal"
                className={
                  selectedColorKey === key
                    ? 'selected-color'
                    : 'unselected-color'
                }
              >
                <div className={'rectangle ' + key}></div>
                <div className="legend-label font-size-4">
                  {addCountToKey(key)}
                </div>
              </Stack>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
