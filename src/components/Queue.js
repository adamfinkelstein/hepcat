import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack'
import {useAppGlobals} from '../contexts/AppContext'
import QueueElement from './QueueElement.js'
import {useState} from 'react'
import AdminQueueControls from './AdminQueueControls';

export default function Queue(){
 
    const globals = useAppGlobals();
    const queue = globals.queue;
    const user = globals.user;
    const current = globals.queueCurrent;
    const counter = current + 1;
    const currentCount = counter > queue.length ? "completed" : counter + " of";
    const past_max = 3;
    const future_max = 12;
    const start_index = Math.max(0, current - past_max);
    const end_index = Math.min(counter + future_max, queue.length);
    const queueSlice = queue.slice(start_index, end_index);

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
        if (index === globals.queueCurrent){
            className += " current"
        }
        else {
            if (index < globals.queueCurrent){
              className += " past"
            }
            if (index % 2) {
              className += " odd_row"
            }
        }
        return className
    }

    return(
        <Container className="Queue">
            {
                user && user.role_name === "Admin" &&
                <AdminQueueControls/>
            }
            <Container className="expand-bar">
                <Stack direction="horizontal">
                    <span className='current-text'>Current: {currentCount} {queue.length}</span>
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
                    queueSlice.map((paper, index) => {
                        return(
                            <li key={index} className={currentClass(index+start_index)}>
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