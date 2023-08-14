import Stack from 'react-bootstrap/Stack';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBorderAll } from '@fortawesome/free-solid-svg-icons';
import { useAppGlobals } from '../contexts/AppContext';

export default function GridControls({
  showingStickie,
  setShowingStickie,
  showGrid,
  setShowGrid,
  showingQueueGUI,
  setShowingQueueGUI,
}) {
  const globals = useAppGlobals();
  const user = globals.user;
  const isAdmin = globals.isAdmin;
  return (
    <Stack direction="horizontal" className="grid-controls">
      {!showingQueueGUI && (
        <button
          onClick={() => {
            setShowGrid(showGrid === true ? false : true);
          }}
          type="button"
          className="btn btn-primary"
        >
          <FontAwesomeIcon icon={faBorderAll} />
          <span style={{ marginLeft: '10px' }}>
            {' '}
            {showGrid ? 'Hide' : 'Show'} Grid
          </span>
        </button>
      )}
      {showGrid && !showingQueueGUI && (
        <button
          style={{ marginLeft: '20px' }}
          onClick={() => {
            setShowingStickie(showingStickie === true ? false : true);
          }}
          type="button"
          className="btn btn-primary"
        >
          <span>{showingStickie ? 'Hide' : 'Show'} Stickies</span>
        </button>
      )}
      {user && isAdmin && (
        <button
          style={{ margin: '0 auto' }}
          onClick={() => {
            setShowingQueueGUI(showingQueueGUI === true ? false : true);
          }}
          type="button"
          className="btn btn-primary"
        >
          <span>{showingQueueGUI ? 'Hide' : 'Show'} Set Queue</span>
        </button>
      )}
    </Stack>
  );
}
