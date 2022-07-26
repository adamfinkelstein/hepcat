import React, {useState, useContext, useEffect} from 'react'
import socketIOClient from "socket.io-client";
import {useFlasher} from './FlasherContext'
import smartquotes from 'smartquotes';
import moment from 'moment'

const AppGlobalsContext = React.createContext() 

export function useAppGlobals(){
  return useContext(AppGlobalsContext)
}

export default function AppContext({children}){
    
  const [user, setUser] = useState(null)
  const [queue, setQueue] = useState([])
  const [grid, setGrid] = useState([])
  const [queueCurrent, setQueueCurrent] = useState(0)
  const [probeCount, setProbeCount] = useState(0)
  const [probeWhen, setProbeWhen] = useState('')
  const [socket, setSocket] = useState(null);
  const [serverGlobs, setServerGlobs] = useState(null)
  const [newStatus, setNewStatus] = useState("Tabled")
  const [guiBar, setGuiBar] = useState('');
  const [aboutMD, setAboutMD] = useState('');
  const flasher = useFlasher()
  const flash = flasher["flash"]

  // for modal dialog 
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalBody, setModalBody] = useState("")

  const [showLogs, setShowLogs] = useState(false)

  /* 
    serverGlobs Fields:
      bar: Float
      current: Int
      current_history: Array[History obj]
      current_show: Boolean
      current_start: DateTime
      current_status: String (Conference, Journal, Reject, Tabled) - maybe not needed???
      hide_queue: Boolean
      message: String

    Set in react to include the following:
      queueCurrentID (numerical id to access grid)
  */

  useEffect(() => {
    const endpt = process.env.REACT_APP_SOCKET_ENDPOINT;
    const newSocket = endpt ? socketIOClient(endpt) : socketIOClient();
    setSocket(newSocket);
    return () => newSocket.close();
  }, [setSocket]);

  useEffect(() => {
    const showLogsEnv = process.env.REACT_APP_SHOW_LOGS
    console.log(showLogsEnv)
    setShowLogs(showLogsEnv)
  }, [])

  useEffect(() => {

    controlledLog(socket);

    const receiveWelcome = (data) => {
      controlledLog('received welcome:')
      controlledLog(data)
      setUser(data.user)
      setGrid(data.grid)
      setAboutMD(smartquotes(data.about))
    };

    function updateGridEntry(nid, status) {
      let grid_entry = locateGridEntry(grid.above_nids, grid.above, nid);
      if (!grid_entry) {
        grid_entry = locateGridEntry(grid.below_nids, grid.below, nid);
      }
      if (!grid_entry) {
        controlledLog('cannot find grid entry for nid:', nid);
        return;
      }
      //controlledLog('about to update grid entry:', grid_entry)
      if (status) {
        grid_entry.status = status;
        grid_entry.stickie = false;
      }
      else {
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
      setQueue(newQueue);
    }

    const receiveUpdate = (data) => {
      controlledLog('received update:');
      controlledLog(data); // queue_index, grid_nid, status
      updateGridEntry(data.grid_nid, data.status);
      updateQueueEntry(data.queue_index, data.status)
    };

    const receiveStickie = (grid_nid) => {
      controlledLog('received stickie: '+grid_nid);
      updateGridEntry(grid_nid, null); // null status -> set stickie
    }

    const receiveGlobs = (data) => {
      controlledLog('received globs:');
      controlledLog(data);
      setQueueCurrent(data.current);
      setServerGlobs(data);
      const status = data.current_status;
      const update = data.update;
      if (status) {
        setNewStatus(status);
      }
      if (update) {
        // set status of previous paper in grid and queue
        receiveUpdate(update);
      }
      const barString = data.bar + ''
      setGuiBar(barString)
      controlledLog('got globs and set bar to:', barString);
    }

    const receiveQueue = (data) => {
      controlledLog('received queue:');
      controlledLog(data);
      setQueue(data.paper_list);
      receiveGlobs(data.globs);
    };

    const receiveProbe = (count) => {
      const now = Date.now()
      const fmt = moment.utc(now).local().format('ddd h:mm:ss')
      controlledLog('received probe count: '+count+" "+fmt)
      setProbeCount(count)
      setProbeWhen(fmt)
    };

    const receiveGrid = (data) => {
      controlledLog('received grid:');
      controlledLog(data);
      setGrid(data);
    };

    const receiveAlert = (data) => {
      setModalTitle(data.title);
      setModalBody(data.body);
      setShowModal(true);
    }

    const receiveFlasher = (data) => {
      controlledLog('got flasher:')
      controlledLog(data)
      flash(data.message, data.type, data.which)
    }

    if (socket && 'on' in socket) {
      // controlledLog('register welcome etc');
      socket.on('server_welcome', receiveWelcome);
      socket.on('server_set_queue', receiveQueue);
      socket.on('server_set_grid', receiveGrid);
      socket.on('server_set_globs', receiveGlobs);
      socket.on('server_set_stickie', receiveStickie);
      socket.on('server_send_alert', receiveAlert);
      socket.on('server_send_flasher', receiveFlasher);
      socket.on('server_probe_count', receiveProbe);
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_set_queue', receiveQueue);
        socket.off('server_set_grid', receiveGrid);
        socket.off('server_set_globs', receiveGlobs);
        socket.off('server_set_stickie', receiveStickie);
        socket.off('server_send_alert', receiveAlert);
        socket.off('server_send_flasher', receiveFlasher);
        socket.off('server_probe_count', receiveProbe);
      }
    };
  }, [queue, grid, socket]);


  function locateGridEntry(grid_index, grid_list, nid) {
    const index = grid_index.indexOf(nid);
    if (index >= 0 && index < grid_list.length) {
      return grid_list[index];
    }
    return null;
  }

  function checkValidNID(nid){
    let grid_entry = locateGridEntry(grid.above_nids, grid.above, nid);
    if (!grid_entry) {
      grid_entry = locateGridEntry(grid.below_nids, grid.below, nid);
    }
    if (!grid_entry) {
      return false
    }
    return true
  }

  function socketEmit(message, data) {
    if (!socket || !socket.emit) {
      controlledLog("socket does not eaxist, message not sent.");
      return;
    }
    if (data) {
      socket.emit(message, data);
      return;
    }
    socket.emit(message);
  }

  function controlledLog(...output){
    if(showLogs){
      console.log(...output)
    }
  }

  return (
      <AppGlobalsContext.Provider 
        value={{
          "user": user,
          "queue": queue,
          "grid": grid,
          "aboutMD": aboutMD,
          "queueCurrent": queueCurrent,
          "newStatus": newStatus,
          "setNewStatus": setNewStatus,
          "socketEmit": socketEmit,
          "serverGlobs": serverGlobs,
          "showModal": showModal,
          "setShowModal": setShowModal,
          "modalTitle": modalTitle,
          "setModalTitle": setModalTitle,
          "setModalBody": setModalBody,
          "modalBody": modalBody,
          "probeCount": probeCount,
          "probeWhen": probeWhen,
          "guiBar": guiBar,
          "setGuiBar": setGuiBar,
          "controlledLog": controlledLog,
          "statusList": ['Tabled','Reject','Conference','Journal'],
          "checkValidNID": checkValidNID
        }}>
        {children}
      </AppGlobalsContext.Provider>
  )
}

