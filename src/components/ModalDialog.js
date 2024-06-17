import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useModalDialog } from '../contexts/ModalDialogContext';

export default function ModalDialog() {
  const { showModal, modalTitle, modalBody, revealModalDialog } =
    useModalDialog();

  const hideModalDialog = () => revealModalDialog(false);

  return (
    <Modal show={showModal} onHide={hideModalDialog}>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{modalBody}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={hideModalDialog}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
