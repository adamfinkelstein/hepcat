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
    const isAdmin = globals.isAdmin
    const current = globals.queueCurrent;
    const counter = current + 1;
    const currentCount = counter > queue.length ? "completed" : counter + " of";
    const isScreen = user && user.role_name === "Screen"
    const past_max = isScreen ? 0 : 3;
    const future_max = 12;
    const start_index = Math.max(0, current - past_max);
    const end_index = Math.min(counter + future_max, queue.length);
    const queueSlice = queue.slice(start_index, end_index);
    const hideQueue = globals.serverGlobs && globals.serverGlobs.hide_queue
    
    const [queueExpanded, setQueueExpanded] = useState(false);

    function currentClass(index, paper, nid){
        const isConflict = user.conflict_papers.includes(paper.nid)
        let className = "queue_element"
        if (index === globals.queueCurrent){
            className += " Current"
        }
        else if (index < globals.queueCurrent){
            className += " Past";
            if (!isScreen && !isConflict) {
                className += " " + paper.status;
            }
        }
        else if (index % 2) { // future - odd?
            className += " odd_row"
        }
        return className
    }

    return(
        <Container className="Queue">
            {
                user && isAdmin &&
                <AdminQueueControls/>
            }
            <Container className="expand-bar">
                { hideQueue &&
                  (<div className="font-size-3 queue-hidden-for-non">(Queue is hidden for non-admin users.)</div>)
                }
                <Stack direction="horizontal">
                    <span className='font-size-2'>Current: {currentCount} {queue.length}</span>
                    <div className="expand-buttons">
                        {
                            !queueExpanded && 
                            <button onClick={() => setQueueExpanded(true)}
                                    type="button" className="btn btn-light expand-button paper-change-button font-size-3"> 
                                Expand all 
                            </button>
                        }
                        {
                            queueExpanded && 
                            <button onClick={() => setQueueExpanded(false)}
                                    type="button" className="btn btn-light collapse-button paper-change-button 
                                    font-size-3" style={{marginLeft: "10px"}}> 
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
                            <li key={index} className={currentClass(index+start_index, paper)}>
                                <QueueElement paper={paper} active={queueExpanded} />
                            </li> 
                        )
                    })
                }
                </ul>
            </Container>
        </Container>
    )
}