import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useModalDialog } from '../contexts/ModalDialogContext';

export default function ModalDialog() {
  const {
    showModal,
    modalTitle,
    modalBody,
    modalClose,
    modalButton,
    modalOnOK,
    revealModalDialog,
  } = useModalDialog();

  const hideModalDialog = () => {
    revealModalDialog({});
  };

  const onOK = () => {
    hideModalDialog();
    if (modalOnOK) {
      modalOnOK();
    }
  };

  return (
    <Modal show={showModal} backdrop="static" onHide={hideModalDialog}>
      <Modal.Header closeButton={modalClose}>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{modalBody}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onOK}>
          {modalButton}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
