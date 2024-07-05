import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';

export default function ConfirmationBox() {
  const {
    showConfirmation,
    setShowConfirmation,
    confirmationTitle,
    confirmationBody,
    confirmationCallback,
  } = useConfirmationBox();

  const handleConfirmButton = () => {
    if (!showConfirmation) return;
    if (confirmationCallback) {
      confirmationCallback(true);
    }
    setShowConfirmation(false);
  };

  const handleCancelButton = () => {
    if (!showConfirmation) return;
    if (confirmationCallback) {
      confirmationCallback(false);
    }
    setShowConfirmation(false);
  };

  return (
    <Modal show={showConfirmation} onHide={handleCancelButton}>
      <Modal.Header closeButton>
        <Modal.Title>{confirmationTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{confirmationBody}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCancelButton}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirmButton}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
