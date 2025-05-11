import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useSocketIO } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';

const adminContext = createContext();

export default function AdminContext({ children }) {
  const { socket } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const [disableLogins, setDisableLogins] = useState(false);

  const updateDisableLogins = useCallback(
    (disable) => {
      if (disable === disableLogins) return; // no change
      setDisableLogins(disable);
      socket.emit('admin_set_disable_logins', disable);
      controlledLog('admin_set_disable_logins: ', disable);
    },
    [disableLogins, setDisableLogins, socket, controlledLog],
  );

  useEffect(() => {
    const receiveDisableLogins = (disabled) => {
      controlledLog('receiveDisableLogin', disabled);
      setDisableLogins(disabled);
    };
    if (socket && 'on' in socket) {
      controlledLog('register socket handlers in AdminContext');
      socket.on('server_relay_disable_logins', receiveDisableLogins);
    }
    // cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('cleanup socket handlers in AdminContext');
        socket.off('server_relay_disable_logins', receiveDisableLogins);
      }
    };
  }, [socket, controlledLog, setDisableLogins]);

  return (
    <adminContext.Provider value={{ disableLogins, updateDisableLogins }}>
      {children}
    </adminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(adminContext);
}
