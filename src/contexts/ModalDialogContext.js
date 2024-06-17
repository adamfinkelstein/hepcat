import { createContext, useContext, useState, useCallback } from 'react';

const modalDialogContext = createContext();

export default function ModalDialogContext({ children }) {
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');

  const revealModalDialog = useCallback(
    (title, message) => {
      if (title && message) {
        setModalTitle(title);
        setModalBody(message);
        setShowModal(true);
      } else {
        setModalTitle('');
        setModalBody('');
        setShowModal(false);
      }
    },
    [setModalTitle, setModalBody, setShowModal],
  );

  return (
    <modalDialogContext.Provider
      value={{ revealModalDialog, showModal, modalTitle, modalBody }}
    >
      {children}
    </modalDialogContext.Provider>
  );
}

export function useModalDialog() {
  return useContext(modalDialogContext);
}
