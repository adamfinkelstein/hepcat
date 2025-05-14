import React, { useCallback } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useSocketIO } from './SocketIOContext.js';
import { useControlledLog } from './ControlledLogContext.js';
import { useKey } from './KeyContext';
import { useStorage } from './StorageContext';

const userContext = createContext();

export default function UserContext({ children }) {
  const { socket, socketEmit, socketSetAuthToken, registerIoHandlers } =
    useSocketIO();
  const { controlledLog } = useControlledLog();
  const { setPaperKeys } = useKey();
  const { setStorageUserID } = useStorage();

  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState(null); // XXX move to KeyContext??? or AdminContext????
  const [allUsers, setAllUsers] = useState({});
  const [allRooms, setAllRooms] = useState([]);
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

  const receiveWelcome = useCallback(
    (data) => {
      controlledLog('received welcome:', data);
      socketSetAuthToken(data.token);
      setPaperKeys(data.paper_keys);
      setAllRooms(data.all_rooms);
      const user = data?.user;
      const email = user?.email;
      const room = user?.room_name;
      const isAdmin = user?.role_is_admin;
      setUser(user);
      setStorageUserID(email);
      setRoomChoice(room);
      setIsAdmin(isAdmin);
      if (isAdmin) {
        setAdminKey(data.admin_key);
        setGitInfo(data.git_info);
      }
      socketEmit('user_request_grid');
      socketEmit('user_request_queue', roomChoice);
    },
    [
      controlledLog,
      setUser,
      setStorageUserID,
      setIsAdmin,
      setAdminKey,
      setGitInfo,
      setPaperKeys,
      setAllRooms,
      socketSetAuthToken,
      roomChoice,
      socketEmit,
    ],
  );

  const receiveRefreshUser = useCallback(
    (oneUser) => {
      controlledLog('received refresh for one user:', oneUser);
      controlledLog(oneUser);
      const allUsersCopy = { ...allUsers };
      const email = oneUser.email;
      allUsersCopy[email] = oneUser;
      setAllUsers(allUsersCopy);
    },
    [controlledLog, allUsers, setAllUsers],
  );

  const receiveRefreshAllUsers = useCallback(
    (usersObj) => {
      controlledLog('received refresh for all users:');
      controlledLog(usersObj);
      setAllUsers(usersObj);
    },
    [controlledLog, setAllUsers],
  );

  // if logged in, do nothing.
  // if socket gets set to null, clear user and admin key etc.
  useEffect(() => {
    if (socket) return; // logged in already
    if (user || socket === null) {
      setUser(null);
      setStorageUserID(null);
      setIsAdmin(false);
      setAdminKey('');
      setPaperKeys(null);
    }
  }, [
    user,
    socket,
    setUser,
    setStorageUserID,
    setIsAdmin,
    setAdminKey,
    setPaperKeys,
  ]);

  const getHandlers = useCallback(() => {
    return {
      server_welcome: receiveWelcome,
      server_refresh_user: receiveRefreshUser,
      server_refresh_all_users: receiveRefreshAllUsers,
    };
  }, [receiveWelcome, receiveRefreshUser, receiveRefreshAllUsers]);

  useEffect(() => {
    const context = 'UserContext';
    const handlers = getHandlers();
    return registerIoHandlers(handlers, context);
  }, [getHandlers, registerIoHandlers]);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        adminKey,
        gitInfo,
        allUsers,
        allRooms,
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
