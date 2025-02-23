import { useAppGlobals } from '../contexts/AppContext';
import { useFavorites } from '../contexts/PreferencesContext';
import { useGrid } from '../contexts/GridContext';

export default function GridBlock({ nidList }) {
  const { gridMode, gridGetElemByNid } = useGrid();
  const { queue, queueCurrent } = useAppGlobals();
  const favorites = useFavorites();
  const showCurrent = gridMode === 'Normal' || gridMode === 'This Room';
  const queueCurrentOk =
    queue.length && queueCurrent < queue.length && queueCurrent >= 0;
  const queueCurrentID = queueCurrentOk ? queue[queueCurrent].nid : 0;

  function gridGetClasses(nid) {
    let className = 'grid-item ';
    const gridElem = gridGetElemByNid(nid);
    if (!gridElem) {
      return className;
    }
    className += gridElem.status;
    const nonSticky = gridMode === 'Stickies' && !gridElem.sticky;
    const nonFavorite = gridMode === 'Favorites' && !favorites.includes(nid);
    // if (gridElem.sticky) {
    //   className += ' sticky-border'; // no thick border now
    // }
    if (gridElem.tabled_sticky) {
      className += ' Tabled-Sticky';
    }
    // else if (gridElem.sticky) { AF added but not needed
    //   // sticky but not tabled
    //   className += ' Ready';
    // }
    if (nonSticky || nonFavorite) {
      className += ' faded-grid';
    }
    if (showCurrent && gridElem.nid === queueCurrentID) {
      className += ' Current';
    }
    return className;
  }

  return (
    <div className="GridBlock grid-container">
      {nidList.map((nid) => {
        return (
          <div key={nid} className={gridGetClasses(nid)}>
            <span>{nid}</span>
          </div>
        );
      })}
    </div>
  );
}
