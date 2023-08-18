import React from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useFlasher } from './FlasherContext';
import smartquotes from 'smartquotes';

const userContext = React.createContext();

export default function UserContext({ children }) {
  const { socket, socketEmit } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();

  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminKey, setAdminKey] = React.useState('');
  const [paperKeys, setPaperKeys] = React.useState(null);
  const [allUsers, setAllUsers] = React.useState([]);
  const [roomCalledTo, setRoomCalledTo] = React.useState('Plenary');
  const [roomChoice, setRoomChoice] = React.useState('Plenary');
  const [aboutMD, setAboutMD] = React.useState('');

  React.useEffect(() => {
    if (socket) {
      const receiveWelcome = (data) => {
        controlledLog('received welcome:');
        controlledLog(data);
        setUser(data.user);
        const isAdmin = data.user && data.user.role_is_admin;
        setIsAdmin(isAdmin);
        if (isAdmin && data.all_users && data.all_users.length) {
          setAllUsers(data.all_users);
        }
        if (isAdmin && data.admin_key && data.admin_key.length) {
          setAdminKey(data.admin_key);
        }
        setPaperKeys(data.paper_keys);
        setAboutMD(smartquotes(data.about));
        if (data.user.room_name) {
          //const room = roomCodeToRoom(data.user.in_room)
          setRoomChoice(data.user.room_name);
          setRoomCalledTo(data.user.room_name);
        }
        socketEmit('user_request_grid');
        socketEmit('user_request_queue', roomChoice);
      };

      const belongInRoom = (room) => {
        if (room === 'Plenary') {
          return true;
        }
        const roomLetter = room.slice(-1); // last letter of room string
        if (user && user.rooms && user.rooms.includes(roomLetter)) {
          return true;
        }
        return false;
      };

      const receiveCallToRoom = (data) => {
        const room = data.room;
        const alreadyThere = room === roomChoice;
        if (isAdmin && data.all_users && data.all_users.length) {
          setAllUsers(data.all_users);
        }
        if (belongInRoom(room)) {
          setRoomChoice(room);
          setRoomCalledTo(room);
          if (!alreadyThere) {
            flash('Admin brought you to ' + room, 'success', 'room_change');
          }
        }
      };

      const receiveRefresh = (all_users) => {
        controlledLog('received refresh with all users:');
        controlledLog(all_users);
        setAllUsers(all_users);
      };

      socket.on('server_welcome', receiveWelcome);
      socket.on('server_call_to_room', receiveCallToRoom);
      socket.on('server_refresh_users', receiveRefresh);

      return () => {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_call_to_room', receiveCallToRoom);
        socket.off('server_refresh_users', receiveRefresh);
      };
    }
  }, [socket, controlledLog, flash, isAdmin, roomChoice, socketEmit, user]);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        adminKey,
        paperKeys,
        allUsers,
        roomCalledTo,
        roomChoice,
        aboutMD,
      }}
    >
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
  return React.useContext(userContext);
}
