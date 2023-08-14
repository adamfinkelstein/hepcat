import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';
import { useFlasher } from '../contexts/FlasherContext';

export default function Flasher({ type }) {
  let flasher = useFlasher();
  let visible = flasher['visible'];
  let hideFlash = flasher['hideFlash'];
  let flashMessage = flasher['flashMessage'];

  return (
    <Collapse in={visible[type]}>
      <div>
        <Alert
          variant={flashMessage.type || 'info'}
          dismissible
          onClose={hideFlash}
        >
          {flashMessage.message}
        </Alert>
      </div>
    </Collapse>
  );
}
