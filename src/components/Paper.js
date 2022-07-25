import moment from 'moment'
import Container from 'react-bootstrap/Container';
import {useAppGlobals} from '../contexts/AppContext'

export default function Paper(){

    const globals = useAppGlobals();
    const queue = globals.queue;
    const isPaper = queue && queue.length && globals.queueCurrent < queue.length;
    const queueCurrent = globals.queueCurrent;
    const currentShow = globals.serverGlobs.current_show;
    const currentShowEnter = globals.serverGlobs.current_show_enter;
    const cp = isPaper ? queue[queueCurrent] : null; // current paper
    const hist = globals.serverGlobs.current_history;
    const showHist = hist && hist.length > 0
    const safeScores = cp ? cp.all_scores : ''
    const scoresHTML = formatScoresInHTML(safeScores);

    let np = null // next paper
    let current_enter = currentShowEnter == 1 ? cp.enter : []
    let current_leave = currentShowEnter == 1 ? cp.leave : []
    if (isPaper && currentShowEnter == -1) {
        np = queue[queueCurrent+1]
        current_enter = np.leave // note backward because of prev button
        current_leave = np.enter
    }
    function extraSpaceBefore(scores, before) {
        const after = '&nbsp;&nbsp;&nbsp;' + before
        const ret = scores.replace(before,after)
        return ret
    }

    function formatScoresInHTML(scores) {
        let html = scores
        // // now this is done at server: replace empty conf reviews
        // const re = /c\[( \?)+ \]/; // regexp match 
        // html = html.replace(re,'c[x]');
        html = html.replaceAll('_A_','<b>A</b>')
        html = html.replaceAll('_R_','<b>R</b>')
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
                    <div><span className='font-size-2'>Conflicts:</span>
                        { cp.conflicts.length ?
                        (<ul>
                            {cp.conflicts.map( (user,index) => {
                                return (
                                    <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                                )
                            })}
                        </ul>) : (<p>(none)</p>)
                        }
                    </div>
                    {current_leave && current_leave.length ?
                        (<div><span className='font-size-2'>Leave:</span>
                        <ul>
                            {current_leave.map( (user,index) => {
                                return (
                                    <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                                )
                            })}
                        </ul>
                        </div>) : ("")
                    }
                    {current_enter && current_enter.length ?
                        (<div><span className='font-size-2'>Return:</span>
                        <ul>
                            {current_enter.map( (user,index) => {
                                return (
                                    <li key={index}><span className='font-size-3'>{user.full_name}</span></li>
                                )
                            })}
                        </ul>
                        </div>) : ("")
                    }
                </div>
                ) : (
                <div>
                    <div className="debug-timer">{currentShow} {isPaper}</div>
                    <p className='paper-title font-size-2'>Q{cp.queue_order} ({cp.nid}): {cp.title}</p>
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
