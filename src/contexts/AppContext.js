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

    const receiveQueue = (data) => {
      console.log('received queue:');
      console.log(data);
      const maxSize = 50;
      const queue = data.paper_list;
      const current = data.current;
      const len = queue.length;
      if (len > maxSize) {
        console.log('cutting queue size down from ' + len + ' to ' + maxSize);
        queue = queue.slice(0,maxSize);
      }
      setQueue(queue);
      setQueueCurrent(current);
    };

    if (socket && 'on' in socket) {
      console.log('register welcome etc');
      socket.on('server_welcome', receiveWelcome);
      socket.on('server_set_queue', receiveQueue);
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('server_welcome', receiveWelcome);
        socket.off('server_set_queue', receiveQueue);
      }
    };
  }, [socket]);

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
        }}>
        {children}
      </AppGlobalsContext.Provider>
  )
}
