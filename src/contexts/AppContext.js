import React, {useState, useContext, useEffect} from 'react'
import socketIOClient from "socket.io-client";

const UserContext = React.createContext()
const QueueContext = React.createContext()
const GridContext = React.createContext()
const SocketEmitContext = React.createContext()
const GlobalsContext = React.createContext() // holds user's and queue's current paper and more

export function useUser(){
  return useContext(UserContext)
}

export function useQueue(){
  return useContext(QueueContext)
}

export function useGrid(){
  return useContext(GridContext)
}

export function useGlobals(){
  return useContext(GlobalsContext)
}

export function useSocketEmit(){
  return useContext(SocketEmitContext)
}

export default function AppContext({children}){
    
  const [user, setUser] = useState(null)
  const [queue, setQueue] = useState([])
  const [grid, setGrid] = useState([])
  const [userCurrent, setUserCurrent] = useState(3)
  const [queueCurrent, setQueueCurrent] = useState(3)
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const endpt = "http://127.0.0.1:5000/"; // change this to go to specific PORT
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
      setQueue(data);
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

  function socketEmit(message, data){
    if(socket && socket.emit){
      if(data) socket.emit(message, data)
      else socket.emit(message)
    }else{
      console.log("socket does not exist, message not sent.")
    }
  }

  return(
      <UserContext.Provider value={user}>
        <QueueContext.Provider value={queue}>
          <GridContext.Provider value={grid}>
            <GlobalsContext.Provider 
              value={
                {"userCurrent": userCurrent, // index in queue
                "queueCurrent": queueCurrent, // nid
                "setUserCurrent": setUserCurrent}
              }>
              <SocketEmitContext.Provider value={socketEmit}>
                {children}
              </SocketEmitContext.Provider>
            </GlobalsContext.Provider>
          </GridContext.Provider>
        </QueueContext.Provider>
      </UserContext.Provider>
  )
}
