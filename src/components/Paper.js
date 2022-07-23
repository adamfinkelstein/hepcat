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
    const hist = globals.serverGlobs.current_history;
    const showHist = hist && hist.length > 0
    const safeScores = cp ? cp.all_scores : ''
    const scoresHTML = formatScoresInHTML(safeScores);

    function extraSpaceBefore(scores, before) {
        const after = '&nbsp;&nbsp;&nbsp;' + before
        const ret = scores.replace(before,after)
        return ret
    }

    function formatScoresInHTML(scores) {
        let html = scores.replaceAll('_R_','<b>R</b>')
        html = extraSpaceBefore(html, ' j[')
        html = extraSpaceBefore(html, 'c[')
        html = extraSpaceBefore(html, 'bbs:')
        const ret = {__html: html}
        return ret
    }

    function formatHistoryElement(h) {
        return h.status + " (" + moment.utc(h.when).local().format('ddd LT') + ")"
    }

    function formatHistoryList(histList) {
        if (!histList) return ''
        const fmt = histList.map(formatHistoryElement).join(', ');
        return fmt
    }

    return(
        <Container className="Paper">

            <div>
            { !isPaper ? (
                (<p>No current paper.</p>)
            ) : ( !currentShow ? (
                <div>
                    <span className='font-size-2'>Conflicts:</span>
                    <ul>
                        {cp.conflicts.map( (user,index) => {
                            return (
                                <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                            )
                        })}
                    </ul>
                    <span className='font-size-2'>Leave:</span>
                    <ul>
                        {cp.leave.map( (user,index) => {
                            return (
                                <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                            )
                        })}
                    </ul>
                    <span className='font-size-2'>Return:</span>
                    <ul>
                        {cp.enter.map( (user,index) => {
                            return (
                                <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                            )
                        })}
                    </ul>
                </div>
                ) : (
                <div>
                    <div className="debug-timer">{currentShow} {isPaper}</div>
                    <span className='paper-title font-size-2'>Q{cp.queue_order} ({cp.nid}): {cp.title}</span>
                    <br/>
                    <p className='font-size-3' >Reviews: <span className='font-size-4' dangerouslySetInnerHTML={scoresHTML}/></p>
                    { showHist &&
                        (<p className='font-size-3'>History: <span className='font-size-4'>{formatHistoryList(hist)}</span></p>)
                    }
                    <p className='font-size-3'>Summary: <span className='font-size-4'>{cp.summary}</span></p>
                    <p className='font-size-3'>Abstract: <span className='font-size-4'>{cp.abstract}</span></p>
                    <div className='paper-img-container'><img src={cp.thumbnail} className="paper-image" alt="Representative Pic for Paper"></img></div>
                </div>
            ))}
            </div>            
        </Container>
    )
}
