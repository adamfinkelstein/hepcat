import React from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useFlasher } from './FlasherContext';
import smartquotes from 'smartquotes';

const userContext = React.createContext();

export default function UserContext({ children }) {
  const { socket, socketEmit, setToken } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();

  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminKey, setAdminKey] = React.useState('');
  const [paperKeys, setPaperKeys] = React.useState(null);
  const [allUsers, setAllUsers] = React.useState([]);
  const [allRooms, setAllRooms] = React.useState([]);
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
        setAllRooms(data.all_rooms);
        setAboutMD(smartquotes(data.about));
        if (data.user.room_name) {
          setRoomChoice(data.user.room_name);
          setRoomCalledTo(data.user.room_name);
        }
        setToken(data.token);
        socketEmit('user_request_grid');
        socketEmit('user_request_queue', roomChoice);
      };

      const belongInRoom = (room) => {
        if (room === 'Plenary') {
          return true;
        }
        const roomCode = room.slice(-2); // last two chars, like 1A
        if (user && user.rooms && user.rooms.includes(roomCode)) {
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
    } else {
      setUser(null);
      setIsAdmin(false);
      setAdminKey('');
      setPaperKeys(null);
    }
  }, [
    socket,
    controlledLog,
    flash,
    isAdmin,
    roomChoice,
    socketEmit,
    setToken,
    user,
  ]);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        adminKey,
        paperKeys,
        allUsers,
        allRooms,
        roomCalledTo,
        roomChoice,
        setRoomChoice,
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
