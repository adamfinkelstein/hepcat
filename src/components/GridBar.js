import { useAppGlobals } from '../contexts/AppContext';
import { useCount } from '../contexts/CountContext';

export default function GridBar() {
  const { globBar } = useAppGlobals();
  const { getGridCount } = useCount();
  const nAbove = getGridCount('above');
  const nBelow = getGridCount('below');
  const barString = 'bar: ' + globBar;

  return (
    <div className="GridBar">
      {nBelow} below
      <span className="barText">
        &nbsp;&lt;&nbsp;{barString}&nbsp;&le;&nbsp;
      </span>
      {nAbove} above
    </div>
  );
}
