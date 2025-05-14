import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useAppGlobals } from '../contexts/AppContext';
import ChooseStatusDropdown from './ChooseStatusDropdown';

const statusList = ['Tabled', 'Reject', 'Conference', 'Journal'];

export default function AdminQueueControls() {
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const { queueCurrent, queue, serverGlobs } = useAppGlobals();
  const { updateStatus, setUpdateStatus } = useAdmin();
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
    const data = { roomChoice, updateStatus };
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
        currentChoice={updateStatus}
        setValue={setUpdateStatus}
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
