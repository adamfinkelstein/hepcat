import React from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useFlasher } from './FlasherContext';

const userContext = React.createContext();

export default function UserContext({ children }) {
  const { socket, socketEmit, socketSetAuthToken } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();

  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminKey, setAdminKey] = React.useState('');
  const [conflictbot, setConflictbot] = React.useState(false);
  const [paperKeys, setPaperKeys] = React.useState(null);
  const [allUsers, setAllUsers] = React.useState({});
  const [allRooms, setAllRooms] = React.useState([]);
  const [roomCalledTo, setRoomCalledTo] = React.useState('Plenary');
  const [roomChoice, setRoomChoice] = React.useState('Plenary');
  const [gitInfo, setGitInfo] = React.useState('');
  const [showAbstract, setShowAbstract] = React.useState(true);
  const [showGlobalOps, setShowGlobalOps] = React.useState(false);

  React.useEffect(() => {
    if (!socket) {
      setUser(null);
      setIsAdmin(false);
      setAdminKey('');
      setPaperKeys(null);
    } else {
      const receiveWelcome = (data) => {
        controlledLog('received welcome:');
        controlledLog(data);
        setUser(data.user);
        const isAdmin = data.user && data.user.role_is_admin;
        setIsAdmin(isAdmin);
        setConflictbot(data.conflictbot_enabled);
        if (isAdmin && data.all_users) {
          setAllUsers(data.all_users);
        }
        if (isAdmin && data.admin_key && data.admin_key.length) {
          setAdminKey(data.admin_key);
        }
        if (isAdmin && data.git_info) {
          setGitInfo(data.git_info);
        }
        setPaperKeys(data.paper_keys);
        setAllRooms(data.all_rooms);
        if (data.user.room_name) {
          setRoomChoice(data.user.room_name);
          setRoomCalledTo(data.user.room_name);
        }
        socketSetAuthToken(data.token);
        socketEmit('user_request_grid');
        socketEmit('user_request_queue', roomChoice);
      };

      const userBelongsInRoom = (room) => {
        if (room === 'Plenary') {
          return true;
        }
        if (user && user.rooms && user.rooms.includes(room)) {
          return true;
        }
        return false;
      };

      const receiveCallToRoom = (data) => {
        controlledLog('called to room:');
        controlledLog(data);
        const room = data.room;
        const bring = data.bring;
        const wereAssigned = room === roomCalledTo;
        if (isAdmin && data.all_users) {
          // removed extra condition: && data.all_users.length
          setAllUsers(data.all_users);
        }
        let target = null;
        if (bring && userBelongsInRoom(room)) {
          target = room;
        } else if (!bring && wereAssigned) {
          target = 'Plenary';
        }
        if (target) {
          setRoomChoice(target);
          setRoomCalledTo(target);
          const msg = 'Admin sent you to ' + target;
          flash(msg, 'success');
        }
      };

      const receiveRefreshUser = (oneUser) => {
        controlledLog('received refresh for one user:');
        controlledLog(oneUser);
        controlledLog('before refresh one user, old user list:');
        controlledLog(allUsers);
        const allUsersCopy = { ...allUsers };
        const email = oneUser.email;
        allUsersCopy[email] = oneUser;
        setAllUsers(allUsersCopy);
        controlledLog('after refresh one user, new user list:');
        controlledLog(allUsersCopy);
      };

      const receiveRefreshAllUsers = (usersObj) => {
        controlledLog('received refresh for all users:');
        controlledLog(usersObj);
      };

      socket.on('server_welcome', receiveWelcome);
      socket.on('server_call_to_room', receiveCallToRoom);
      socket.on('server_refresh_user', receiveRefreshUser);
      socket.on('server_refresh_all_users', receiveRefreshAllUsers);

      return () => {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_call_to_room', receiveCallToRoom);
        socket.off('server_refresh_user', receiveRefreshUser);
        socket.off('server_refresh_all_users', receiveRefreshAllUsers);
      };
    }
  }, [
    socket,
    controlledLog,
    flash,
    isAdmin,
    roomChoice,
    roomCalledTo,
    socketEmit,
    socketSetAuthToken,
    user,
    allUsers,
    gitInfo,
  ]);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        adminKey,
        gitInfo,
        conflictbot,
        paperKeys,
        allUsers,
        allRooms,
        roomCalledTo,
        roomChoice,
        setRoomChoice,
        showAbstract,
        setShowAbstract,
        showGlobalOps,
        setShowGlobalOps,
      }}
    >
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
  return React.useContext(userContext);
}
