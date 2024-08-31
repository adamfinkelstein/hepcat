import { useAppGlobals } from '../contexts/AppContext';
import { useFavorites } from '../contexts/PreferencesContext';

export default function Grid({ isAbove, gridDisplay }) {
  // const globals = useAppGlobals();
  const { queue, grid, queueCurrent } = useAppGlobals();
  const favorites = useFavorites();
  const aboveOrBelowIDs = isAbove ? grid.above_nids : grid.below_nids;
  const idsOrEmpty = aboveOrBelowIDs ? aboveOrBelowIDs : [];
  const queueCurrentOk =
    queue.length && queueCurrent < queue.length && queueCurrent >= 0;
  const queueCurrentID = queueCurrentOk ? queue[queueCurrent].nid : 0;

  function gridGetClasses(nid) {
    const gridElem = grid.papers[nid];
    const nonSticky = gridDisplay === 'Stickies' && !gridElem.sticky;
    const nonFavorite = gridDisplay === 'Favorites' && !favorites.includes(nid);
    let className = 'grid-item ' + gridElem.status;
    if (gridElem.sticky) {
      className += ' sticky-border';
    }
    if (nonSticky || nonFavorite) {
      className += ' faded-grid';
    }
    if (gridDisplay === 'Normal' && gridElem.nid === queueCurrentID) {
      className += ' Current';
    }
    return className;
  }

  return (
    <div className="Grid grid-container">
      {idsOrEmpty.map((nid) => {
        return (
          <div key={nid} className={gridGetClasses(nid)}>
            <span className="font-size-4">{nid}</span>
          </div>
        );
      })}
    </div>
  );
}
