import { useAppGlobals } from '../contexts/AppContext';
import { useCount } from '../contexts/CountContext';

export default function GridBar() {
  const { appBar } = useAppGlobals();
  const { getGridCount } = useCount();
  const nAbove = getGridCount('above');
  const nBelow = getGridCount('below');

  return (
    <div className="GridBar">
      {nBelow} below
      <span className="barText">
        &nbsp;&lt;&nbsp;bar:&nbsp;{appBar}&nbsp;&le;&nbsp;
      </span>
      {nAbove} above
    </div>
  );
}
