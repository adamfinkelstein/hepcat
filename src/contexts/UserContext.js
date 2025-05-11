import React, { useCallback } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useFlasher } from './FlasherContext';
import { useKey } from './KeyContext';
import { useStorage } from './StorageContext';

const userContext = createContext();

export default function UserContext({ children }) {
  const { socket, socketEmit, socketSetAuthToken } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { setPaperKeys } = useKey();
  const { setStorageUserID } = useStorage();

  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState(''); // XXX move to KeyContext??? or AdminContext????
  const [conflictbot, setConflictbot] = useState(false);
  const [allUsers, setAllUsers] = useState({});
  const [allRooms, setAllRooms] = useState([]);
  const [roomCalledTo, setRoomCalledTo] = useState('Plenary');
  const [roomChoice, setRoomChoice] = useState('Plenary');
  const [gitInfo, setGitInfo] = useState('');
  const [showGlobalOps, setShowGlobalOps] = useState(false);

  const isScreenRole = useCallback(() => {
    return user?.role_name === 'Screen';
  }, [user]);

  const isOutsideRole = useCallback(() => {
    return user?.role_name === 'Outside';
  }, [user]);

  // either type of screen role
  const isScreenOrOutside = useCallback(() => {
    return isScreenRole() || isOutsideRole();
  }, [isScreenRole, isOutsideRole]);

  useEffect(() => {
    if (!socket) {
      if (user || socket === null) {
        setUser(null);
        setStorageUserID(null);
      }
      setIsAdmin(false);
      setAdminKey('');
      setPaperKeys(null);
    } else {
      const receiveWelcome = (data) => {
        controlledLog('received welcome:');
        controlledLog(data);
        setUser(data.user);
        if (data.user && data.user.email) {
          setStorageUserID(data.user.email);
        }
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
        // controlledLog('before refresh one user, old user list:');
        // controlledLog(allUsers);
        const allUsersCopy = { ...allUsers };
        const email = oneUser.email;
        allUsersCopy[email] = oneUser;
        setAllUsers(allUsersCopy);
        // controlledLog('after refresh one user, new user list:');
        // controlledLog(allUsersCopy);
      };

      const receiveRefreshAllUsers = (usersObj) => {
        controlledLog('received refresh for all users:');
        controlledLog(usersObj);
        setAllUsers(usersObj);
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
    setPaperKeys,
    setStorageUserID,
  ]);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        adminKey,
        gitInfo,
        conflictbot,
        allUsers,
        allRooms,
        roomCalledTo,
        roomChoice,
        setRoomChoice,
        showGlobalOps,
        setShowGlobalOps,
        isScreenRole,
        isOutsideRole,
        isScreenOrOutside,
      }}
    >
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
  return useContext(userContext);
}
