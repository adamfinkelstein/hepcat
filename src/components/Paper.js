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
                    <h2 className='paper-title custom-font-size'>Q{current}: {currentPaper.title}</h2>
                    <br></br>
                    <p className='custom-font-size'>{currentPaper.abstract}</p>
                    <div className='paper-img-container'><img src={currentPaper.thumbnail} className="paper-image"></img></div>
                </div>
            )}
            </div>            
        </Container>
    )
}