import Stack from 'react-bootstrap/Stack';
import { useColors } from '../contexts/PreferencesContext';
// import { click } from '@testing-library/user-event/dist/click';

export default function ColorsDisplay({
  clickable,
  selectedColorKey,
  setSelectedColorKey,
}) {
  const colors = useColors();
  const colorKeys = Object.keys(colors);

  return (
    <div className="ColorsDisplay">
      <div className="col-head font-size-3">Plenary Status</div>
      <ul>
        {colorKeys.map((key) => {
          // Something like this comment code could make the selected color
          // behave like a grid item, for better preview. But it's a bit broken.
          // const selected = clickable && selectedColorKey === key;
          // const className = selected
          //   ? 'grid-item ' + selectedColorKey
          //   : 'legend-container';
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
                <div className="legend-label font-size-3">{key}</div>
              </Stack>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
