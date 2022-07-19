import React, {useState, useContext, useEffect} from 'react'
import socketIOClient from "socket.io-client";

const AppGlobalsContext = React.createContext() 

export function useAppGlobals(){
  return useContext(AppGlobalsContext)
}

export default function AppContext({children}){
    
  const [user, setUser] = useState(null)
  const [queue, setQueue] = useState([])
  const [grid, setGrid] = useState([])
  const [queueCurrent, setQueueCurrent] = useState(0)
  const [socket, setSocket] = useState(null);
  const [serverGlobs, setServerGlobs] = useState(null)
  const [newStatus, setNewStatus] = useState("Tabled");

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

    console.log(socket);

    const receiveWelcome = (data) => {
      console.log('received welcome:');
      console.log(data);
      setUser(data.user);
      setGrid(data.grid);
    };

    function locateGridEntry(grid_index, grid_list, nid) {
      const index = grid_index.indexOf(nid);
      if (index >= 0 && index < grid_list.length) {
        return grid_list[index];
      }
      return null;
    }

    function updateGridEntry(nid, status) {
      let grid_entry = locateGridEntry(grid.above_nids, grid.above, nid);
      if (!grid_entry) {
        grid_entry = locateGridEntry(grid.below_nids, grid.below, nid);
      }
      if (!grid_entry) {
        console.log('cannot find grid entry for nid:',nid);
        return;
      }
      //console.log('about to update grid entry:', grid_entry)
      grid_entry.status_full = status;
      grid_entry.stickie = false;
      //console.log('just updated grid entry:', grid_entry)
      const newGrid = { ...grid };
      setGrid(newGrid); // force update
    }

    function updateQueueEntry(queue_index, status) {
      if (queue_index < 0 || queue_index >= queue.length) {
        console.log('cannot updateQueueEntry at queue_index ', queue_index);
        return;
      }
      queue[queue_index].status = status;
      const newQueue = [...queue];
      setQueue(newQueue);
    }

    const receiveUpdate = (data) => {
      console.log('received update:');
      console.log(data); // queue_index, grid_nid, status
      updateGridEntry(data.grid_nid, data.status);
      updateQueueEntry(data.queue_index, data.status)
    };

    const receiveGlobs = (data) => {
      console.log('received globs:');
      console.log(data);
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
    }

    const receiveQueue = (data) => {
      console.log('received queue:');
      console.log(data);
      setQueue(data.paper_list);
      receiveGlobs(data.globs);
    };

    if (socket && 'on' in socket) {
      // console.log('register welcome etc');
      socket.on('server_welcome', receiveWelcome);
      socket.on('server_set_queue', receiveQueue);
      socket.on('server_set_globs', receiveGlobs);
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_set_queue', receiveQueue);
        socket.off('server_set_globs', receiveGlobs);
      }
    };
  }, [queue, grid, socket]);

  function socketEmit(message, data) {
    if (!socket || !socket.emit) {
      console.log("socket does not exist, message not sent.");
      return;
    }
    if (data) {
      socket.emit(message, data);
      return;
    }
    socket.emit(message);
  }

  return (
      <AppGlobalsContext.Provider 
        value={{
          "user": user,
          "queue": queue,
          "grid": grid,
          "queueCurrent": queueCurrent,
          "newStatus": newStatus,
          "setNewStatus": setNewStatus,
          "socketEmit": socketEmit,
          "serverGlobs": serverGlobs,
        }}>
        {children}
      </AppGlobalsContext.Provider>
  )
}
