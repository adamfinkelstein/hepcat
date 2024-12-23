import Stack from 'react-bootstrap/Stack';

export default function ColorLabel({ rectClass = '', label, extra = null }) {
  const fullRectClass = 'rectangle ' + rectClass;
  let extraClass = 'legend-extra';
  if (extra === 'PULLDOWN') {
    extra = '▾';
    extraClass += ' pull-down';
  }
  return (
    <Stack className="ColorLabel" direction="horizontal" gap={1}>
      <div className={fullRectClass} />
      <div className="legend-label">{label}</div>
      {extra && <div className={extraClass}>{extra}</div>}
    </Stack>
  );
}
