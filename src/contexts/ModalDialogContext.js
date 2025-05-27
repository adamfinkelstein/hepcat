import React, { useState, useCallback } from 'react';

const modalDialogContext = React.createContext();

export default function ModalDialogContext({ children }) {
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [modalClose, setModalClose] = useState(true);
  const [modalButton, setModalButton] = useState('OK');
  const [modalOnOK, setModalOnOK] = useState(undefined);

  // the argument to revealModalDialog is an object with these properties::
  // - title: (required) the title of the modal dialog
  // - message: (required) the body of the modal dialog
  // - close: (optional) a boolean indicating whether the modal dialog can be closed (default true)
  // - button: (optional) the text for the button (default 'OK')
  // - onOK: (optional) a function to call when the button is clicked
  const revealModalDialog = useCallback(
    ({ title, message, close, button, onOK }) => {
      if (title && message) {
        setModalTitle(title);
        setModalBody(message);
        setModalClose(close ?? true);
        setModalButton(button || 'OK');
        setModalOnOK(() => onOK);
        setShowModal(true);
      } else {
        setModalTitle('');
        setModalBody('');
        setModalClose(true);
        setModalButton('OK');
        setModalOnOK(undefined);
        setShowModal(false);
      }
    },
    [
      setModalTitle,
      setModalBody,
      setModalClose,
      setModalButton,
      setModalOnOK,
      setShowModal,
    ]
  );

  return (
    <modalDialogContext.Provider
      value={{
        revealModalDialog,
        showModal,
        modalTitle,
        modalClose,
        modalBody,
        modalButton,
        modalOnOK,
      }}
    >
      {children}
    </modalDialogContext.Provider>
  );
}

export function useModalDialog() {
  return React.useContext(modalDialogContext);
}
