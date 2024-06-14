import { createContext, useContext, useState, useCallback } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Stack from 'react-bootstrap/Stack';
import Alert from 'react-bootstrap/Alert';
import { useControlledLog } from '../contexts/ControlledLogContext';

const FlasherContext = createContext();
let flashId = 0; // use incrementing number to assign a unique ID to each alert

export function useFlasher() {
  return useContext(FlasherContext);
}

export default function FlashContext({ children }) {
  // the messages state variable below holds a list of notifications
  // each entry has four elements:
  // - message: the message text
  // - type: the alert type (success, info, etc.)
  // - flashId: a unique identifier for the alert
  // - visible: true when the alert appears sliding from the right,
  //   false when the alert needs to slide out
  const [messages, setMessages] = useState([]);
  const { controlledLog } = useControlledLog();

  const hideFlash = useCallback(
    (id) => {
      controlledLog('hideFlash', id);
      setMessages((messages) =>
        messages.map((message) =>
          message.flashId === id ? { ...message, visible: false } : message,
        ),
      );

      // let the slide out animation play, then delete this alert
      const deleteFlash = (id) => {
        controlledLog('deleteFlash', id);
        setMessages((messages) =>
          messages.filter((message) => message.flashId !== id),
        );
      };
      setTimeout(deleteFlash.bind(null, id), 600);
    },
    [controlledLog],
  );

  const flash = useCallback(
    (message, type, duration) => {
      const id = ++flashId;
      if (duration === undefined) {
        duration = 4;
      }

      setMessages((messages) => [
        ...messages,
        { message, type, flashId: id, visible: true },
      ]);
      if (duration) {
        setTimeout(hideFlash.bind(null, id), duration * 1000);
      }
    },
    [hideFlash],
  );

  return (
    <FlasherContext.Provider
      value={{
        flash: flash,
      }}
    >
      {children}
      <Offcanvas
        show={true}
        placement="end"
        scroll={true}
        backdrop={false}
        autoFocus={false}
        keyboard={false}
        className="Flasher"
      >
        <Offcanvas.Body>
          <Stack direction="vertical" gap={3}>
            <div className="filler" />
            {messages.map((message) => (
              <Alert
                key={message.flashId}
                variant={message.type}
                className={
                  message.visible
                    ? 'FlasherAlert'
                    : 'FlasherAlert FlasherAlertClosed'
                }
                dismissible
                onClose={hideFlash.bind(null, message.flashId)}
              >
                {message.message}
              </Alert>
            ))}
          </Stack>
        </Offcanvas.Body>
      </Offcanvas>
    </FlasherContext.Provider>
  );
}
