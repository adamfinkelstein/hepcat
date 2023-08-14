// import { Container } from "react-bootstrap";
import Stack from 'react-bootstrap/Stack';
import { useColors } from '../contexts/PreferencesContext';

export default function ColorsDisplay({
  clickable,
  pickingFor,
  setPickingFor,
}) {
  let colors = useColors();

  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  return (
    <div className="grid_legend">
      <div className="legend-title font-size-3">Plenary Status</div>
      <ul>
        {Object.keys(colors).map((key) => {
          return (
            <li
              key={key}
              className="legend-container"
              onClick={() => {
                if (clickable) {
                  setPickingFor(key);
                }
              }}
            >
              <Stack
                direction="horizontal"
                className={pickingFor === key ? 'picking-for' : 'legend-stack'}
              >
                <div className={'rectangle ' + key}></div>
                <div className="legend-label font-size-3">
                  {toTitleCase(key)}
                </div>
              </Stack>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
