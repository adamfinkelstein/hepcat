import { useQueue } from '../contexts/QueueContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useGrid } from '../contexts/GridContext';

export default function GridBlock({ nidList }) {
  const { gridMode, gridGetElemByNid } = useGrid();
  const { queue, queueCurrent } = useQueue();
  const { favorites } = usePreferences();
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
    const nonFavorite = gridMode === 'Favorites' && !favorites.includes(nid);
    if (nonFavorite) {
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
