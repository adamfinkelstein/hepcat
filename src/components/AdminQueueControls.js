import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAppGlobals } from '../contexts/AppContext';
import ChooseStatusDropdown from './ChooseStatusDropdown';

export default function AdminQueueControls() {
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const { newStatus, setNewStatus, queueCurrent, queue, serverGlobs } =
    useAppGlobals();
  const disablePrev = queueCurrent === 0;
  const disableNext = queueCurrent >= queue.length;
  const disableShow = disableNext || serverGlobs.current_show;

  const handleUpArrow = () => {
    socketEmit('admin_prev_paper', roomChoice);
  };

  const handleDownArrow = () => {
    socketEmit('admin_next_paper', roomChoice);
  };

  const handleAdvanceButton = () => {
    const data = { roomChoice, newStatus };
    socketEmit('admin_advance_queue', data);
  };

  const handleShowButton = () => {
    socketEmit('admin_show_current', roomChoice);
  };

  return (
    <Stack direction="horizontal" className="AdminQueueControls">
      <Button
        disabled={disablePrev}
        type="button"
        className="btn btn-light paper-change-button"
        onClick={handleUpArrow}
      >
        &uarr;
      </Button>
      <Button
        disabled={disableNext}
        type="button"
        className="btn btn-light paper-change-button"
        onClick={handleDownArrow}
      >
        &darr;
      </Button>
      <Button
        disabled={disableShow}
        type="button"
        className="btn btn-light paper-change-button"
        onClick={handleShowButton}
      >
        Show
      </Button>
      <ChooseStatusDropdown currentStatus={newStatus} setValue={setNewStatus} />
      <Button
        disabled={disableNext}
        type="button"
        className="btn btn-light paper-change-button advance-btn"
        onClick={handleAdvanceButton}
      >
        Advance
      </Button>
    </Stack>
  );
}
