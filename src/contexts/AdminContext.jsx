// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useCallback, useEffect } from 'react';
import { DateTime } from 'luxon';
import { useSocketIO, useSocketHandler } from './SocketIOContext';
import { useControlledLog } from './ControlledLogContext';
import { useUser } from './UserContext';

const adminContext = React.createContext();

const notSetYetMsg = '(not set)';

export default function AdminContext({ children }) {
  const { socketEmit } = useSocketIO();
  const { controlledLog } = useControlledLog();
  const { roomChoice, belongsInRoom } = useUser();
  const [disableLogins, setDisableLogins] = useState(false);
  const [probeGUIMsg, setProbeGUIMsg] = useState(notSetYetMsg);
  const [probeTextMsg, setProbeTextMsg] = useState(notSetYetMsg);
  const [fileUploads, setFileUploads] = useState(null);
  const [locBar, setLocBar] = useState(''); // value in set bar input text box
  const [locHideQ, setLocHideQ] = useState(false); // checkbox to hide queue
  const [locHideMsg, setLocHideMsg] = useState(''); // text box msg
  const [updateStatus, setUpdateStatus] = useState('Tabled');
  const [gitInfo, setGitInfo] = useState('');
  const [allUsers, setAllUsers] = useState({});
  const [roomChairs, setRoomChairs] = useState([]);
  const [roomBackups, setRoomBackups] = useState([]);
  const [showDangerous, setShowDangerous] = useState(false);

  useEffect(() => {
    const roleAndRoomMatch = (user, role, room) => {
      return user.role_name == role && belongsInRoom(user, room);
    };
    const filterUsersByRoomAndRole = (users, room, role) => {
      return users.filter((user) => roleAndRoomMatch(user, role, room));
    };
    const userArr = Object.values(allUsers);
    const c = filterUsersByRoomAndRole(userArr, roomChoice, 'Chair');
    const b = filterUsersByRoomAndRole(userArr, roomChoice, 'Backup');
    setRoomChairs(c);
    setRoomBackups(b);
  }, [roomChoice, allUsers, belongsInRoom]);

  const countOnlineUsers = useCallback(() => {
    let count = 0;
    for (const [email, user] of Object.entries(allUsers)) {
      if (email && user.is_online) count++;
    }
    return count;
  }, [allUsers]);

  // Called by QueueContext when new Queue arrives.
  // Reset both probes to not set yet.
  // Need callback because exported.
  const resetProbeMsgs = useCallback(() => {
    setProbeGUIMsg(notSetYetMsg);
    setProbeTextMsg(notSetYetMsg);
  }, []);

  // Update admin local variables from QueueContext.
  const recordAdminGlobs = useCallback(
    (data) => {
      controlledLog('recordAdminGlobs', data);
      setLocHideQ(data.hide_queue);
      setLocHideMsg(data.message);
      if (data.current_status) {
        setUpdateStatus(data.current_status);
      }
    },
    [controlledLog]
  );

  // Called by component that has the switch.
  // Emit changes to server.
  const updateDisableLogins = useCallback(
    (disable) => {
      if (disable === disableLogins) return; // no change
      setDisableLogins(disable);
      socketEmit('admin_set_disable_logins', disable);
      controlledLog('admin_set_disable_logins: ', disable);
    },
    [disableLogins, socketEmit, controlledLog]
  );

  const receiveAdminData = useCallback(
    (data) => {
      controlledLog('receiveAdminData:', data);
      setDisableLogins(data.disable_logins);
      setGitInfo(data.git_info);
      setFileUploads(data.uploads);
    },
    [controlledLog]
  );

  const getMsgFromProbe = useCallback(
    (countStr, label) => {
      const now = Date.now();
      const fmtNow = DateTime.fromMillis(now).toLocal().toFormat('ccc h:mm:ss');
      const fmtMsg = countStr + ' — updated ' + fmtNow;
      const msg = !countStr.length ? notSetYetMsg : fmtMsg;
      controlledLog('received probe ' + label + ' ' + msg);
      return msg;
    },
    [controlledLog]
  );

  const receiveProbeGui = useCallback(
    (countStr) => {
      const msg = getMsgFromProbe(countStr, 'GUI');
      setProbeGUIMsg(msg);
    },
    [getMsgFromProbe]
  );

  const receiveProbeText = useCallback(
    (countStr) => {
      const msg = getMsgFromProbe(countStr, 'text');
      setProbeTextMsg(msg);
    },
    [getMsgFromProbe]
  );

  const receiveRefreshUser = useCallback(
    (oneUser) => {
      controlledLog('received refresh for one user:', oneUser);
      const email = oneUser.email;
      setAllUsers((prevAllUsers) => ({
        ...prevAllUsers,
        [email]: oneUser,
      }));
    },
    [controlledLog]
  );

  const receiveRefreshAllUsers = useCallback(
    (usersObj) => {
      controlledLog('received refresh for all users: ', usersObj);
      setAllUsers(usersObj);
    },
    [controlledLog]
  );

  // register socket event handlers
  const ctx = 'AdminContext';
  useSocketHandler('server_send_admin_data', receiveAdminData, ctx);
  useSocketHandler('server_probe_by_gui', receiveProbeGui, ctx);
  useSocketHandler('server_probe_by_text', receiveProbeText, ctx);
  useSocketHandler('server_refresh_user', receiveRefreshUser, ctx);
  useSocketHandler('server_refresh_all_users', receiveRefreshAllUsers, ctx);

  return (
    <adminContext.Provider
      value={{
        resetProbeMsgs,
        probeGUIMsg,
        probeTextMsg,
        fileUploads,
        disableLogins,
        updateDisableLogins,
        recordAdminGlobs,
        updateStatus,
        setUpdateStatus,
        locBar,
        setLocBar,
        locHideQ,
        setLocHideQ,
        locHideMsg,
        setLocHideMsg,
        showDangerous,
        setShowDangerous,
        gitInfo,
        setGitInfo,
        allUsers,
        setAllUsers,
        countOnlineUsers,
        roomChairs,
        roomBackups,
      }}
    >
      {children}
    </adminContext.Provider>
  );
}

export function useAdmin() {
  return React.useContext(adminContext);
}
