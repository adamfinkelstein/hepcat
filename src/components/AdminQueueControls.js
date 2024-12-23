import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAppGlobals } from '../contexts/AppContext';
import ChooseStatusDropdown from './ChooseStatusDropdown';

export default function AdminQueueControls() {
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const {
    newStatus,
    setNewStatus,
    queueCurrent,
    queue,
    serverGlobs,
    statusList,
  } = useAppGlobals();
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
        className="btn-light arrow-btn"
        onClick={handleUpArrow}
      >
        {upArrow}
      </Button>
      <Button
        disabled={disableNext}
        className="btn-light arrow-btn"
        onClick={handleDownArrow}
      >
        {dnArrow}
      </Button>
      <Button
        disabled={disableShow}
        className="btn-light"
        onClick={handleShowButton}
      >
        Show
      </Button>
      <ChooseStatusDropdown
        choiceList={statusList}
        currentChoice={newStatus}
        setValue={setNewStatus}
      />
      <Button
        disabled={disableNext}
        className="btn-light"
        onClick={handleAdvanceButton}
      >
        Advance
      </Button>
    </Stack>
  );
}
