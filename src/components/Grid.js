//import { Container } from "react-bootstrap";
import { useAppGlobals } from '../contexts/AppContext';
import { useFavorites } from '../contexts/PreferencesContext';
//import FavoritePreferences from './FavoritePreferences';

export default function Grid({ isAbove, gridDisplay }) {
  const globals = useAppGlobals();
  const favorites = useFavorites();
  const queue = globals.queue;
  const grid = globals.grid;
  const aboveOrBelowIDs = isAbove ? grid.above_nids : grid.below_nids;
  const idsOrEmpty = aboveOrBelowIDs ? aboveOrBelowIDs : [];

  let queueCurrentID = 0; // none has 0 nid
  if (
    queue.length &&
    globals.queueCurrent < queue.length &&
    globals.queueCurrent >= 0
  ) {
    queueCurrentID = queue[globals.queueCurrent].nid;
  }

  function gridGetClasses(nid) {
    const gridElem = grid.papers[nid];
    let className = 'grid-item';
    let paperStatus = gridElem.status;

    if (gridDisplay === 'Stickie') {
      if (gridElem.stickie) {
        className += ' stickie';
      } else {
        className += ' non-stickie';
      }
    } else if (gridDisplay === 'Favorites') {
      if (favorites.includes(gridElem.nid)) {
        className += ' ' + paperStatus;
      } else {
        className += ' non-stickie';
      }
      if (gridElem.stickie) {
        className += ' has-stickie';
      }
    } else {
      if (gridElem.nid === queueCurrentID) {
        className += ' Current';
      } else {
        className += ' ' + paperStatus;
      }
      if (gridElem.stickie) {
        className += ' has-stickie';
      }
    }
    return className;
  }

  return (
    <div className="grid-container">
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
