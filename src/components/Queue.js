import Container from 'react-bootstrap/Container';
import {useQueue, useGlobals} from '../contexts/AppContext'
import QueueElement from './QueueElement.js'
import {useState} from 'react'

export default function Queue(){
 
    const queue = useQueue()
    const globals = useGlobals()

    let allClosed = []
    for(let i = 0; i < queue.length; i++){
        allClosed.push("")
    }

    let allOpen = []
    for(let i = 0; i < queue.length; i++){
        allOpen.push("active")
    }
    const [queueExpanded, setQueueExpanded] = useState(allClosed);

    function currentClass(index){
        let className = "queue_element"
        if(index === globals.userCurrent){
          className += " current"
        }
        return className
    }

    function toggleActive(index){
        let newState = [...queueExpanded]
        newState[index] = newState[index] === "active" ? "" : "active"
        setQueueExpanded(newState)
    }

    return(
        <Container className="Queue">
            <div className="expand-bar">
                <button onClick={() => setQueueExpanded(allOpen)} disabled={queueExpanded.every(s => s === "active")}> 
                    Expand all 
                </button>
                <button onClick={() => setQueueExpanded(allClosed)} disabled={queueExpanded.every(s => s === "")}> 
                    Collapse all 
                </button>
            </div>
            <Container className="queue-container">
                <ul>
                    {
                    queue.map((paper, index) => {
                        return(
                            <li key={index} className={currentClass(index)}>
                                <QueueElement paper={paper} active={queueExpanded[index]} toggleActive={toggleActive}/>
                            </li> 
                        )
                    })
                }
                </ul>
            </Container>
        </Container>
    )
}