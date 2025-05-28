import Stack from 'react-bootstrap/Stack';

export default function ColorLabel({
  rectClass = '',
  label,
  extra = null,
  labelClass = '',
  clickHandler = null,
}) {
  const fullRectClass = 'rectangle ' + rectClass;
  const fullLabelClass = 'ColorLabel ' + labelClass;
  let extraClass = 'legend-extra';
  if (extra === 'PULLDOWN') {
    extra = '▾';
    extraClass += ' pull-down';
  }
  return (
    <Stack
      className={fullLabelClass}
      direction="horizontal"
      gap={1}
      onClick={clickHandler}
    >
      <div className={fullRectClass} />
      <div className="legend-label">{label}</div>
      {extra && <div className={extraClass}>{extra}</div>}
    </Stack>
  );
}
