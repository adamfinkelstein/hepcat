import Container from 'react-bootstrap/Container';
import {useAppGlobals} from '../contexts/AppContext'

export default function Paper({showPaper}){

    const globals = useAppGlobals();
    const queue = globals.queue;
    const isPaper = queue && queue.length;
    const queueCurrent = globals.queueCurrent;
    const cp = isPaper ? queue[queueCurrent] : null; // current paper

    return(
        <Container className="Paper">

            <div>
            {(!isPaper || !showPaper) ? (
                (showPaper ? <p>No current paper.</p> : <p>Paper hidden.</p>)
            ) : (
                <div>
                    <h2 className='paper-title custom-font-size'>Q{cp.queue_order} ({cp.nid}): {cp.title}</h2>
                    <br/>
                    <p className='custom-font-size'>Reviews: {cp.all_scores}&nbsp;Sort:{cp.sort_score}</p>
                    <p className='custom-font-size'>Summary: {cp.summary}</p>
                    <p className='custom-font-size'>Abstract: {cp.abstract}</p>
                    <div className='paper-img-container'><img src={cp.thumbnail} className="paper-image" alt="Representative Pic for Paper"></img></div>
                </div>
            )}
            </div>            
        </Container>
    )
}
