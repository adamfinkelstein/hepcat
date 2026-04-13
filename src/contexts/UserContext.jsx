// Copyright (c) 2025-2026 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useCallback, useState, useEffect } from 'react';
import { useSocketIO, useSocketHandler } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';
import { useKey } from './KeyContext';
import { useStorage } from './StorageContext';

const userContext = React.createContext();

const belongsInRoom = (user, room) =>
  room === 'Plenary' || user?.rooms?.includes(room);

export default function UserContext({ children }) {
  const { socket, socketEmit, socketAuthTokenSet } = useSocketIO();
  const { controlledLog, setShowLogs } = useControlledLog();
  const { setPaperKeys } = useKey();
  const { setStorageUserID } = useStorage();

  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [roomChoice, setRoomChoice] = useState('Plenary');

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

  const userBelongsInRoom = useCallback(
    (room) => isScreenOrOutside() || belongsInRoom(user, room),
    [user, isScreenOrOutside]
  );

  const receiveWelcome = useCallback(
    (data) => {
      const roomName = data.user.room_name;
      const roomOrPlenary = roomName ? roomName : 'Plenary';
      setShowLogs(data.show_logs); // this should be before next line
      controlledLog('received welcome:', data);
      socketAuthTokenSet(data.token);
      setPaperKeys(data.paper_keys);
      setAllRooms(data.all_rooms);
      setUser(data.user);
      setIsAdmin(data.user.role_is_admin);
      setRoomChoice(roomOrPlenary);
      setStorageUserID(data.user.email);
      socketEmit('user_request_grid');
    },
    [
      socketEmit,
      controlledLog,
      setShowLogs,
      setUser,
      setStorageUserID,
      setIsAdmin,
      setPaperKeys,
      setAllRooms,
      socketAuthTokenSet,
    ]
  );

  // if logged in, do nothing.
  // if socket gets set to null, clear user and admin key etc.
  useEffect(() => {
    if (socket) return; // logged in already
    if (user || socket === null) {
      setUser(null);
      setStorageUserID(null);
      setIsAdmin(false);
      setPaperKeys(null);
    }
  }, [user, socket, setPaperKeys, setStorageUserID]);

  // register socket event handlers
  const ctx = 'UserContext';
  useSocketHandler('server_welcome', receiveWelcome, ctx);

  return (
    <userContext.Provider
      value={{
        user,
        isAdmin,
        allRooms,
        roomChoice,
        setRoomChoice,
        isScreenRole,
        isOutsideRole,
        isScreenOrOutside,
        belongsInRoom,
        userBelongsInRoom,
      }}
    >
      {children}
    </userContext.Provider>
  );
}

export function useUser() {
  return React.useContext(userContext);
}
