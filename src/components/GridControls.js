import Stack from 'react-bootstrap/Stack';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBorderAll } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../contexts/UserContext';

export default function GridControls({
  showingSticky,
  setShowingSticky,
  showGrid,
  setShowGrid,
  showingQueueGUI,
  setShowingQueueGUI,
}) {
  const { user, isAdmin } = useUser();
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
            setShowingSticky(showingSticky === true ? false : true);
          }}
          type="button"
          className="btn btn-primary"
        >
          <span>{showingSticky ? 'Hide' : 'Show'} Stickies</span>
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
