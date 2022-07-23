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
                <h2>Conflicts:</h2>
                <ul>
                    {cp.conflicts.map( (user,index) => {
                        return (
                            <li key={index}>{user.full_name}</li>
                        )
                    })}
                </ul>
                <h2>Leave:</h2>
                <ul>
                    {cp.leave.map( (user,index) => {
                        return (
                            <li key={index}>{user.full_name}</li>
                        )
                    })}
                </ul>
                <h2>Return:</h2>
                <ul>
                    {cp.enter.map( (user,index) => {
                        return (
                            <li key={index}>{user.full_name}</li>
                        )
                    })}
                </ul>
                </div>
                ) : (
                <div>
                    <div className="debug-timer">{currentShow} {isPaper}</div>
                    <h2 className='paper-title custom-font-size'>Q{cp.queue_order} ({cp.nid}): {cp.title}</h2>
                    <br/>
                    <p className='custom-font-size'>Reviews: <span dangerouslySetInnerHTML={scoresHTML}/></p>
                    { showHist &&
                        (<p className='custom-font-size'>History: {formatHistoryList(hist)}</p>)
                    }
                    <p className='custom-font-size'>Summary: {cp.summary}</p>
                    <p className='custom-font-size'>Abstract: {cp.abstract}</p>
                    <div className='paper-img-container'><img src={cp.thumbnail} className="paper-image" alt="Representative Pic for Paper"></img></div>
                </div>
            ))}
            </div>            
        </Container>
    )
}
