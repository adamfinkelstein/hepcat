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
  const upArrow = '\u2B06';
  const dnArrow = '\u2B07';

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
    <Stack direction="horizontal" gap={2} className="AdminQueueControls mt-3">
      <Button
        disabled={disablePrev}
        className="btn-light arrow-btn font-size-4"
        onClick={handleUpArrow}
      >
        {upArrow}
      </Button>
      <Button
        disabled={disableNext}
        className="btn-light arrow-btn font-size-4"
        onClick={handleDownArrow}
      >
        {dnArrow}
      </Button>
      <Button
        disabled={disableShow}
        className="btn-light font-size-4"
        onClick={handleShowButton}
      >
        Show
      </Button>
      <ChooseStatusDropdown currentStatus={newStatus} setValue={setNewStatus} />
      <Button
        disabled={disableNext}
        className="btn-light font-size-4"
        onClick={handleAdvanceButton}
      >
        Advance
      </Button>
    </Stack>
  );
}
