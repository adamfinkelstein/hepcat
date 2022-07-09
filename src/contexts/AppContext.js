import React, {useState, useContext, useEffect} from 'react'
import socketIOClient from "socket.io-client";

const UserContext = React.createContext()
const QueueContext = React.createContext()
const GridContext = React.createContext()
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

export default function AppContext({children}){
    
  const [user, setUser] = useState(null)
  const [queue, setQueue] = useState([])
  const [grid, setGrid] = useState([])
  const [userCurrent, setUserCurrent] = useState(0)
  const [queueCurrent, setQueueCurrent] = useState(0)
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
      socket.on('welcome', receiveWelcome);
      socket.on('queue', receiveQueue);
    }

    return () => {
      if (socket && 'off' in socket) {
        socket.off('welcome', receiveWelcome);
        socket.off('queue', receiveQueue);
      }
    };
  }, [socket]);
  /*
  useEffect(() => {
    fetch("http://127.0.0.1:5000/papers", {
    })
    .then(res => {
      return res.json()
  })
    .then(papers => {
      let status = []
      for(let i = 0; i < papers.length; i++){
        let randomStickie = Math.random()
        let randomStatus = Math.round(Math.random()*4)
        let statusPaper, stickie;
        switch(randomStatus){
          case 0:
            statusPaper = "U"
            break;
          case 1:
            statusPaper = "R"
            break;
          case 2:
            statusPaper = "C"
            break;
          case 3:
            statusPaper = "J"
            break;
          case 4:
            statusPaper = "T"
            break;
          case 5:
            statusPaper = "Q"
            break;
          default:
            statusPaper = "U"
        }
        status.push({"status": statusPaper, "stickie": (randomStickie > 0.5 ? true : false)})
      }
      setStatus(status)
      setPapers(papers)
    })
    .catch(err => {
      console.log(err);
    })
  }, [])
*/


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
              {children}
            </GlobalsContext.Provider>
          </GridContext.Provider>
        </QueueContext.Provider>
      </UserContext.Provider>
  )
}
