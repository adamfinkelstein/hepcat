import Container from 'react-bootstrap/Container';
import {useGlobals, useQueue} from '../contexts/AppContext'

export default function Paper(){

    const globals = useGlobals()
    const queue = useQueue()
    const currentPaper = queue[globals.userCurrent]
    const current = currentPaper.queue_order

    return(
        <Container className="Paper">

            <div>
            {(currentPaper === undefined) ? (
                <p>No data.</p>
            ) : (
                <div>
                    <h2>Q{current}: {currentPaper.submission_id}: {currentPaper.title}</h2>
                    <br></br>
                    <p>{currentPaper.abstract}</p>
                    <img src={currentPaper.thumbnail}></img>
                </div>
            )}
            </div>            
        </Container>
    )
}