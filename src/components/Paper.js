import Container from 'react-bootstrap/Container';
import {useGlobals, useQueue} from '../contexts/AppContext'

export default function Paper(){

    const queue = useQueue();
    const globals = useGlobals();
    const showPaper = queue && queue.length && globals && globals.queueCurrent;
    const cp = queue.length ? queue[globals.userCurrent] : null;
    const queue_order = cp ? cp.queue_order : '-1';

    return(
        <Container className="Paper">

            <div>
            {(showPaper) ? (
                <p>No current paper.</p>
            ) : (
                <div>
                    <h2 className='paper-title custom-font-size'>Q{queue_order} ({cp.nid}): {cp.title}</h2>
                    <br/>
                    <p className='custom-font-size'>Reviews: {cp.all_scores}&nbsp;Sort:{cp.sort_score}</p>
                    <p className='custom-font-size'>Summary: {cp.summary}</p>
                    <p className='custom-font-size'>Abstract: {cp.abstract}</p>
                    <div className='paper-img-container'><img src={cp.thumbnail} className="paper-image"></img></div>
                </div>
            )}
            </div>            
        </Container>
    )
}
