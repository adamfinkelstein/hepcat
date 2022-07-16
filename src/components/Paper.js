import moment from 'moment'
import Container from 'react-bootstrap/Container';
import {useAppGlobals} from '../contexts/AppContext'

export default function Paper(){

    const globals = useAppGlobals();
    const queue = globals.queue;
    const isPaper = queue && queue.length && globals.queueCurrent < queue.length;
    const queueCurrent = globals.queueCurrent;
    const currentShow = globals.serverGlobs.current_show;
    const cp = isPaper ? queue[queueCurrent] : null; // current paper
    const hist = cp ? cp.history : [];
    const histMap = hist.map( h => 
        h.status + " (" + moment(h.when).format('ddd LT') + ")" );
    const histJoin = histMap.join(', ');

    return(
        <Container className="Paper">

            <div>
            { !isPaper ? (
                (<p>No current paper.</p>)
            ) : ( !currentShow ? (
                 <p>Hidden.</p>
                ) : (
                <div>
                    <h2 className='paper-title custom-font-size'>Q{cp.queue_order} ({cp.nid}): {cp.title}</h2>
                    <br/>
                    <p className='custom-font-size'>Reviews: {cp.all_scores}&nbsp;Sort:{cp.sort_score}</p>
                    <p className='custom-font-size'>History: {histJoin}</p>
                    <p className='custom-font-size'>Summary: {cp.summary}</p>
                    <p className='custom-font-size'>Abstract: {cp.abstract}</p>
                    <div className='paper-img-container'><img src={cp.thumbnail} className="paper-image" alt="Representative Pic for Paper"></img></div>
                </div>
            ))}
            </div>            
        </Container>
    )
}
