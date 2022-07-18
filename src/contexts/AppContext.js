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

    function updateGridList(grid_list, nid, status) {
      for (let i = 0; i < grid_list.length; i++) {
        let grid_item = grid_list[i];
        if (grid_item.nid === nid) {
          grid_item.status_full = status;
          return true;
        }
      }
      return false;
    }

    const receiveUpdate = (data) => {
      console.log('received update:');
      console.log(data); // queue_index, grid_nid, status
      //const queue_index = data.queue_index;
      const above = [...grid.above]; // shallow copies
      const below = [...grid.below]; // shallow copies
      const updated = updateGridList(above, data.grid_nid, data.status);
      if (!updated) {
        updateGridList(below, data.grid_nid, data.status);
      }
      const new_grid = {above, below};
      setGrid(new_grid);
      // also update queue entry based on data.queue_index
    };

    const receiveGlobs = (data) => {
      console.log('received globs:');
      console.log(data);
      console.log(queue)
      setQueueCurrent(data.current);
      setServerGlobs(data);

      // set status of previous paper by using setQueue (current)
      // set status of previous paper by using setGrid (nid)
    }

    const receiveQueue = (data) => {
      console.log('received queue:');
      console.log(data);
      setQueue(data.paper_list);
      receiveGlobs(data.globs);
    };

    if (socket && 'on' in socket) {
      console.log('register welcome etc');
      socket.on('server_welcome', receiveWelcome);
      socket.on('server_set_queue', receiveQueue);
      socket.on('server_set_globs', receiveGlobs);
      socket.on('server_send_update', receiveUpdate);
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_set_queue', receiveQueue);
        socket.off('server_set_globs', receiveGlobs);
        socket.off('server_send_update', receiveUpdate);
      }
    };
  }, [queue, socket]);

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
          "socketEmit": socketEmit,
          "serverGlobs": serverGlobs,
        }}>
        {children}
      </AppGlobalsContext.Provider>
  )
}
