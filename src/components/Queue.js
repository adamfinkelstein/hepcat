import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack'
import {useQueue, useGlobals, useUser} from '../contexts/AppContext'
import QueueElement from './QueueElement.js'
import {useState} from 'react'
import AdminQueueControls from './AdminQueueControls';

export default function Queue(){
 
    const queue = useQueue()
    const globals = useGlobals()
    const user = useUser()

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

    return(
        <Container className="Queue">
            {
                user && user.role_name == "Admin" &&
                <AdminQueueControls/>
            }
            <Container className="expand-bar">
                <Stack direction="horizontal">
                    <span className='current-text'>Current: {globals.queueCurrent + 1} of {queue.length}</span>
                    <div className="expand-buttons">
                        {
                            !queueExpanded[0] && 
                            <button onClick={() => setQueueExpanded(allOpen)}
                                    type="button" className="btn btn-light expand-button"> 
                                Expand all 
                            </button>
                        }
                        {
                            queueExpanded[0] && 
                            <button onClick={() => setQueueExpanded(allClosed)}
                                    type="button" className="btn btn-light collapse-button" style={{marginLeft: "10px"}}> 
                                Collapse all 
                            </button>
                        }
                    </div>
                </Stack>
            </Container>
            <Container className="queue-container custom-font-size">
                <ul>
                    {
                    queue.map((paper, index) => {
                        return(
                            <li key={index} className={currentClass(index)}>
                                <QueueElement paper={paper} active={queueExpanded[index]}/>
                            </li> 
                        )
                    })
                }
                </ul>
            </Container>
        </Container>
    )
}