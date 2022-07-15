import {useAppGlobals} from '../contexts/AppContext'
import {useRef} from 'react'
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
//import Chevron from './Chevron.js'
import PaperConflict from './PaperConflict'

export default function QueueElement({paper, active}){

    const globals = useAppGlobals();
    const user = globals.user;
    // const queue = useQueue();
    const content = useRef(null);
    const index = paper ? paper.queue_order - 1 : -1;
    const conflicted = user.conflict_papers.includes(paper.nid);
    const qLine = conflicted ? ': CONFLICTED!' : 
            ( ' (' + paper.nid + '): ' + paper.title );
    // ??? AF cut this from below: `${content.current.scrollHeight}px`

    return(
        <Container onClick={() => {
            globals.setUserCurrent(index)
        }}>
            <Stack direction="horizontal" className="queue-element-container">
                <div>
                    <span className="accordion_title">
                        Q{paper.queue_order}{qLine}
                    </span>
                </div>
            </Stack>
            <div ref={content} style={{ maxHeight: `${(active === "" || content === null) ? "0px" : "100px"}` }} className="accordion_content">
                <div className="accordion_text">
                    <PaperConflict header="Conflicted" conflicts={paper.conflicts}></PaperConflict>
                </div>
                <div className="accordion_text">
                    <PaperConflict header="Enter" conflicts={paper.enter}></PaperConflict>
                </div>
                <div className="accordion_text">
                    <PaperConflict header="Leave" conflicts={paper.leave}></PaperConflict>
                </div>
            </div>
        </Container>
    )
}