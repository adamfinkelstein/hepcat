//import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {useAppGlobals} from '../contexts/AppContext'

export default function ModalDialog() {
    const globals = useAppGlobals();
    const showModal = globals.showModal;
    const setShowModal = globals.setShowModal;
    const modalTitle = globals.modalTitle;
    const modalBody = globals.modalBody;
    const hideModalDialog = () => setShowModal(false);

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
