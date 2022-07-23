import {useAppGlobals} from '../contexts/AppContext'
import {useRef} from 'react'
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
//import Chevron from './Chevron.js'
import PaperConflict from './PaperConflict'
import { useFavorites } from '../contexts/PreferencesContext'

export default function QueueElement({paper, active}){

    const globals = useAppGlobals()
    const favorites = useFavorites()
    const content = useRef(null)
    const user = globals.user;
    const queueIndex = paper ? paper.queue_order - 1 : -1
    const isCurrent = (queueIndex === globals.queueCurrent)
    const isPast = (queueIndex < globals.queueCurrent)
    const isConflict = user.conflict_papers.includes(paper.nid)
    const isFavorite = favorites.includes(paper.nid)
    const isScreen = user && user.role_name === "Screen"
    const showStatus = paper.status && !isCurrent && !isScreen
    const status =  showStatus ? paper.status : ""
    const starSymbol = '\u2605'
    const confSymbol = '\u26D4'
    const prefixSym = isConflict ? confSymbol : (isFavorite ? starSymbol : '')
    const showTitle = isPast ? "" : paper.title
    let qLine =  ' (' + paper.nid + '): ' + status + showTitle 

    if (isScreen) qLine = ''
    else if (isConflict) qLine = ': CONFLICTED!'

    // ??? AF cut this from below: `${content.current.scrollHeight}px`

    return(
        <Container>
            <Stack direction="horizontal" className="queue-element-container">
                <div>
                    <div className="accordion_title">
                    Q{paper.queue_order}{qLine}
                    </div>
                    <div className="qSymbol">{prefixSym}</div>
                </div>
            </Stack>
            {
                !isPast &&
                (<div ref={content} style={{ maxHeight: `${(active === "" || content === null) ? "0px" : "100px"}` }} className="accordion_content">
                    <div className="accordion_text">
                        <PaperConflict header="Conflicts:" conflicts={paper.conflicts}></PaperConflict>
                    </div>
                </div>)
            }
        </Container>
    )
}