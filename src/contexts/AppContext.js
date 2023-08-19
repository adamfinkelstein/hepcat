import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useControlledLog } from './ControlledLogContext';
import { useSocketIO } from './SocketIOContext';
import { useUser } from './UserContext';
import moment from 'moment';

var CryptoJS = require('crypto-js');

const AppGlobalsContext = React.createContext();

const statusList = ['Tabled', 'Reject', 'Conference', 'Journal'];

function decryptMsgUsingKey(msg, keyStr) {
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const decrypted = CryptoJS.AES.decrypt(msg, key, { mode: CryptoJS.mode.ECB });
  const utf8 = decrypted.toString(CryptoJS.enc.Utf8);
  // console.log('\n\nencrypted message: ' + msg)
  // console.log('decrypted message: ' + utf8)
  return utf8;
}

function getTimeInHiddenMessage(msg) {
  const regexp = /===.*===/g;
  const matches = msg.match(regexp);
  if (!matches) return msg;
  for (const match of matches) {
    const timeStr = match.replace(/===/g, '');
    const utcThen = moment(timeStr).format('ddd LT');
    msg = msg.replace(match, utcThen);
  }
  return msg;
}

export function useAppGlobals() {
  return useContext(AppGlobalsContext);
}

export default function AppContext({ children }) {
  const { controlledLog, setShowLogs } = useControlledLog();
  const { socket, socketEmit } = useSocketIO();
  const [queue, setQueue] = useState([]);
  const [grid, setGrid] = useState([]);
  const [queueCurrent, setQueueCurrent] = useState(0);
  const [probeCount, setProbeCount] = useState(0);
  const [probeWhen, setProbeWhen] = useState('');
  const [fileUploads, setFileUploads] = useState(null);
  const [serverGlobs, setServerGlobs] = useState(null);
  const [newStatus, setNewStatus] = useState('Tabled');
  const [guiBar, setGuiBar] = useState('');
  const [hideQ, setHideQ] = useState(false);
  const [hiddenMsg, setHiddenMsg] = useState('');
  const [statusCheckbox, setStatusCheckbox] = useState([]);
  const [onlyCheckbox, setOnlyCheckbox] = useState([]);
  const [scoreSelection, setScoreSelection] = useState('In Range'); // default matches SetQueue.js
  const [lowRange, setLowRange] = useState(-9.0);
  const [highRange, setHighRange] = useState(9.0);
  const [adminQueries, setAdminQueries] = useState([]);
  const [queryName, setQueryName] = useState('');
  const [queryStateHandler, setQueryStateHandler] = useState(null);

  const { user, isAdmin, paperKeys, roomChoice } = useUser();

  // for modal dialog
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');

  const oidIsConflict = useCallback(
    (oid) => {
      if (!paperKeys) return true;
      return !(oid in paperKeys);
    },
    [paperKeys],
  );

  const oidToNid = useCallback(
    (oid) => {
      if (oidIsConflict(oid)) return 0;
      return paperKeys[oid].nid;
    },
    [paperKeys, oidIsConflict],
  );

  const decryptMessageByOid = useCallback(
    (msg, oid) => {
      if (oidIsConflict(oid)) return '';
      const key = paperKeys[oid].key;
      return decryptMsgUsingKey(msg, key);
    },
    [paperKeys, oidIsConflict],
  );

  const decryptObjectOrNull = useCallback(
    (obj) => {
      if (!obj || !obj.oid || oidIsConflict(obj.oid)) return null;
      const str = decryptMessageByOid(obj.enc, obj.oid);
      // controlledLog("======= decrypted json: " + str)
      if (!str) return null;
      return JSON.parse(str);
    },
    [oidIsConflict, decryptMessageByOid],
  );

  const recordGlobsForThisRoom = useCallback(
    (data) => {
      controlledLog('record globs for this room:');
      controlledLog(data);
      data.message = getTimeInHiddenMessage(data.message);
      setHideQ(data.hide_queue);
      setHiddenMsg(data.message);
      if ('showAppLogs' in data) {
        // could be true or false or not exist
        setShowLogs(data.showAppLogs);
      }
      setServerGlobs(data);
      const curr = data ? data.current : 0;
      const status = data ? data.current_status : null;
      setQueueCurrent(curr);
      if (status) {
        setNewStatus(status);
      }
    },
    [
      controlledLog,
      setShowLogs,
      setServerGlobs,
      setQueueCurrent,
      setNewStatus,
      setHideQ,
      setHiddenMsg,
    ],
  );

  useEffect(() => {
    controlledLog('roomChoice is now ' + roomChoice);
    socketEmit('user_request_queue', roomChoice);
    const userPing = () => socketEmit('user_ping', roomChoice);
    const pingEnv = process.env.REACT_APP_PING_TIMER_SECS;
    const pingSec = pingEnv ? parseInt(pingEnv) : 0;
    if (pingSec) {
      const pingTimer = setInterval(userPing, pingSec * 1000);
      controlledLog(
        'set ping timer with secs ' + pingSec + ' and room ' + roomChoice,
      );
      return () => clearInterval(pingTimer);
    }
  }, [roomChoice, controlledLog, socketEmit]);

  useEffect(() => {
    function updateGridEntry(nid, status) {
      const grid_entry = grid && grid.papers ? grid.papers[nid] : null;
      if (!grid_entry) {
        controlledLog('*** cannot find grid entry for nid:', nid);
        return;
      }
      // controlledLog('*** about to update grid entry:', grid_entry)
      if (status) {
        grid_entry.status = status;
        grid_entry.stickie = false;
      } else {
        grid_entry.stickie = true;
      }
      //controlledLog('just updated grid entry:', grid_entry)
      const newGrid = { ...grid };
      setGrid(newGrid); // force update
    }

    function updateQueueEntry(queue_index, status) {
      if (queue_index < 0 || queue_index >= queue.length) {
        controlledLog('cannot updateQueueEntry at queue_index ', queue_index);
        return;
      }
      queue[queue_index].status = status;
      const newQueue = [...queue];
      setQueue(newQueue); // force update
    }

    const receiveStickie = (grid_nid) => {
      controlledLog('received stickie: ' + grid_nid);
      updateGridEntry(grid_nid, null); // null status -> set stickie
    };

    const receiveGlobs = (data) => {
      if (!data) {
        controlledLog('WARNING! received globs with empty data');
        return;
      }
      controlledLog('received globs:');
      controlledLog(data);
      // if there was an update, it was encrypted, so get it...
      if (data.update_encrypted) {
        data.update = decryptObjectOrNull(data.update_encrypted);
        controlledLog('decrypt update:');
        controlledLog(data.update);
      }
      const isTheRoom = data.room === roomChoice;
      if (isTheRoom) {
        recordGlobsForThisRoom(data);
        if (data.update) {
          updateQueueEntry(data.update.queue_index, data.update.status);
        }
      }
      if (data.update) {
        updateGridEntry(data.update.grid_nid, data.update.status);
      }
      // bar is same for all rooms
      const barString = data.bar + '';
      setGuiBar(barString);
      // controlledLog('set bar to:', barString);
    };

    const decryptPaperQueue = (arr) => {
      const dummy = { nid: 0, conflicts: [], enter: [], leave: [] };
      const result = arr.map((p) => {
        const dec = decryptObjectOrNull(p);
        const safe = dec ? dec : dummy;
        return safe;
      });
      return result;
    };

    const receiveQueue = (data) => {
      controlledLog('received queue:');
      controlledLog(data);
      const room = data.globs.room;
      const isTheRoom = room === roomChoice;
      controlledLog(
        'receiveQueue compare rooms: ' +
          room +
          ' ' +
          roomChoice +
          ' ' +
          isTheRoom,
      );
      if (isTheRoom) {
        data.paper_list = decryptPaperQueue(data.paper_list_encrypted);
        setQueue(data.paper_list);
        receiveGlobs(data.globs);
        setProbeWhen(''); // when queue arrives, invalidate probe
      } else {
        // maybe need to check for other updates????XXX
      }
    };

    const receiveFileUploads = (file_uploads) => {
      controlledLog('received file upload status:');
      controlledLog(file_uploads);
      setFileUploads(file_uploads);
    };

    const receiveProbe = (count) => {
      const now = Date.now();
      const fmt = moment.utc(now).local().format('ddd h:mm:ss');
      controlledLog('received probe count: ' + count + ' ' + fmt);
      setProbeCount(count);
      setProbeWhen(fmt);
    };

    const oidListToNidList = (oids) => {
      if (!oids || !oids.length) return null;
      const nids = oids.map((oid) => oidToNid(oid));
      const nids_no0 = nids.filter((nid) => nid > 0);
      return nids_no0;
    };

    const decodeGridPapers = (arr) => {
      const dec = arr.map((enc) => decryptObjectOrNull(enc));
      // returns dictionary indexed by nid
      const papers = {};
      for (let i = 0; i < dec.length; i++) {
        const p = dec[i];
        if (p) {
          papers[p.nid] = p;
        }
      }
      return papers;
    };

    const decodeGridData = (data) => {
      data.above_nids = oidListToNidList(data.above_oids);
      data.below_nids = oidListToNidList(data.below_oids);
      data.papers = decodeGridPapers(data.papers_encrypted);
    };

    const receiveGrid = (data) => {
      decodeGridData(data);
      controlledLog('received and decoded grid:');
      controlledLog(data);
      setGrid(data);
    };

    const receiveAlert = (data) => {
      if (isAdmin || !data.admin_only) {
        setModalTitle(data.title);
        setModalBody(data.body);
        setShowModal(true);
      }
    };

    const receiveLogout = () => {
      controlledLog('got request to logout');
      window.location.href = '/auth/logout';
      // maybe: flash(data.message, data.type, data.which)
    };

    const receiveReload = () => {
      controlledLog('got request to reload');
      window.location.reload();
    };

    const isRoomName = (item) => item.startsWith('Room_');

    const modifyOnlyFiltersInRoom = (onlyList) => {
      if (roomChoice === 'Plenary') {
        return onlyList.filter((item) => !isRoomName(item));
      }
      return onlyList.map((item) => (isRoomName(item) ? roomChoice : item));
    };

    const receiveQuery = (filters) => {
      const modOnly = modifyOnlyFiltersInRoom(filters.only);
      controlledLog('received query, only:');
      controlledLog(filters);
      controlledLog(modOnly);
      setOnlyCheckbox(modOnly);
      setStatusCheckbox(filters.statuses);
      setScoreSelection('In Range');
      setLowRange(filters.lowRange);
      setHighRange(filters.highRange);
    };

    const receiveQueries = (queries) => {
      setAdminQueries(queries);
    };

    if (socket && 'on' in socket) {
      controlledLog('register welcome etc');
      socket.on('server_set_queue', receiveQueue);
      socket.on('server_set_grid', receiveGrid);
      socket.on('server_set_globs', receiveGlobs);
      socket.on('server_set_stickie', receiveStickie);
      socket.on('server_send_alert', receiveAlert);
      socket.on('server_probe_count', receiveProbe);
      socket.on('server_file_uploads', receiveFileUploads);
      socket.on('server_logout_user', receiveLogout);
      socket.on('server_reload_user', receiveReload);
      socket.on('server_send_query', receiveQuery);
      socket.on('server_send_queries', receiveQueries);
    }

    // return from useEffect is function that does cleanup
    return () => {
      if (socket && 'off' in socket) {
        controlledLog('socket cleanup');
        socket.off('server_set_queue', receiveQueue);
        socket.off('server_set_grid', receiveGrid);
        socket.off('server_set_globs', receiveGlobs);
        socket.off('server_set_stickie', receiveStickie);
        socket.off('server_send_alert', receiveAlert);
        socket.off('server_probe_count', receiveProbe);
        socket.off('server_file_uploads', receiveFileUploads);
        socket.off('server_logout_user', receiveLogout);
        socket.off('server_reload_user', receiveReload);
        socket.off('server_send_query', receiveQuery);
        socket.off('server_send_queries', receiveQueries);
      }
    };
  }, [
    queue,
    grid,
    socket,
    isAdmin,
    roomChoice,
    user,
    paperKeys,
    controlledLog,
    socketEmit,
    recordGlobsForThisRoom,
    oidToNid,
    oidIsConflict,
    decryptMessageByOid,
    decryptObjectOrNull,
  ]);

  function checkValidNID(nid) {
    if (!grid || !grid.papers) return false;
    return nid in grid.papers;
  }

  return (
    <AppGlobalsContext.Provider
      value={{
        queue: queue,
        grid: grid,
        queueCurrent: queueCurrent,
        newStatus: newStatus,
        setNewStatus: setNewStatus,
        serverGlobs: serverGlobs,
        showModal: showModal,
        setShowModal: setShowModal,
        modalTitle: modalTitle,
        setModalTitle: setModalTitle,
        setModalBody: setModalBody,
        modalBody: modalBody,
        probeCount: probeCount,
        probeWhen: probeWhen,
        fileUploads: fileUploads,
        guiBar: guiBar,
        setGuiBar: setGuiBar,
        hideQ: hideQ,
        setHideQ: setHideQ,
        hiddenMsg: hiddenMsg,
        setHiddenMsg: setHiddenMsg,

        statusCheckbox: statusCheckbox,
        setStatusCheckbox: setStatusCheckbox,
        onlyCheckbox: onlyCheckbox,
        setOnlyCheckbox: setOnlyCheckbox,
        scoreSelection: scoreSelection,
        setScoreSelection: setScoreSelection,
        lowRange: lowRange,
        setLowRange: setLowRange,
        highRange: highRange,
        setHighRange: setHighRange,

        adminQueries: adminQueries,
        setAdminQueries: setAdminQueries,
        queryName: queryName,
        setQueryName: setQueryName,
        queryStateHandler: queryStateHandler,
        setQueryStateHandler: setQueryStateHandler,
        statusList: statusList,
        checkValidNID: checkValidNID,
      }}
    >
      {children}
    </AppGlobalsContext.Provider>
  );
}
