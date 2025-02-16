import { useAppGlobals } from '../contexts/AppContext';
import { useCount } from '../contexts/CountContext';
import { useUser } from '../contexts/UserContext';

export default function GridBar() {
  const { isAdmin } = useUser();
  const { appBar } = useAppGlobals();
  const { getGridCount } = useCount();
  const nAbove = getGridCount('above');
  const nBelow = getGridCount('below');
  const showBarVal = isAdmin && appBar;
  const barString = showBarVal ? 'bar: ' + appBar : 'bar';

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
