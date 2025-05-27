import React, { useState, useCallback } from 'react';

const confirmationBoxContext = React.createContext();

export default function ConfirmationBoxContext({ children }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationBody, setConfirmationBody] = useState('');
  const [confirmationCallback, setConfirmationCallback] = useState(null);

  const revealConfirmationBox = useCallback(
    (title, message, confirmationCallback) => {
      if (title && message) {
        setShowConfirmation(true);
        setConfirmationTitle(title);
        setConfirmationBody(message);
        // setting callback function in state variable requires extra layer:
        // https://stackoverflow.com/questions/55621212/is-it-possible-to-react-usestate-in-react
        setConfirmationCallback(() => {
          return confirmationCallback;
        });
      } else {
        setShowConfirmation(false);
        setConfirmationTitle('');
        setConfirmationBody('');
        setConfirmationCallback(null);
      }
    },
    [
      setConfirmationTitle,
      setConfirmationBody,
      setShowConfirmation,
      setConfirmationCallback,
    ]
  );

  return (
    <confirmationBoxContext.Provider
      value={{
        showConfirmation,
        setShowConfirmation,
        confirmationTitle,
        confirmationBody,
        confirmationCallback,
        revealConfirmationBox,
      }}
    >
      {children}
    </confirmationBoxContext.Provider>
  );
}

export function useConfirmationBox() {
  return React.useContext(confirmationBoxContext);
}
