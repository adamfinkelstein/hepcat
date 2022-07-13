import Container from 'react-bootstrap/Container'
import Split from 'react-split';
import {useQueue, useUser} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Queue from './Queue'
import Paper from './Paper'
import Grid from './Grid'
import {useState} from 'react'
import GridControls from './GridControls';
import ColorsDisplay from './ColorsDisplay';
import SetQueue from './SetQueue';
import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';

export default function Body(){
    const queue = useQueue()
    const user = useUser()

    const [showGrid, setShowGrid] = useState(false);
    const [showingStickie, setShowingStickie] = useState(false);
    const [showingQueueGUI, setShowingQueueGUI] = useState(false);
    const [gridSize, setGridSize] = useState(60);

    const flasher = useFlasher()
    const flash = flasher["flash"]
    const visible = flasher["visible"]
    const hideFlash = flasher["hideFlash"];
    const flashMessage = flasher["flashMessage"]

    function createGridCSS(){
        return "repeat(" + (Math.floor(gridSize / 4)) + ", 40px)"
    }

    return(
        <Container className='Body'>
            {(!user) ? (
                <p>User not connected.</p>
            ) : (
                    <Split 
                    direction='horizontal'
                    className='split'
                    sizes={[40, 60]}
                    cursor="col-resize"
                    onDrag={(sizes) => {
                        setGridSize(sizes[1])
                    }}
                    minSize={[500, 500]}
                    >
                        <Container>
                            {queue.length ? <Queue/> : <div id="noPapersInQueue">No papers in queue.</div>}
                        </Container>
                        <Container className='right-panel'>
                            <Collapse in={visible}>
                                <div>
                                    <Alert variant={flashMessage.type || 'info'} dismissible
                                    onClose={hideFlash}>
                                        {flashMessage.message}
                                    </Alert>
                                </div>
                            </Collapse>
                            <GridControls showingStickie={showingStickie} setShowingStickie={setShowingStickie} 
                                          showGrid={showGrid} setShowGrid={setShowGrid}
                                          showingQueueGUI={showingQueueGUI} setShowingQueueGUI={setShowingQueueGUI}/>
                            <div className="right-panel-container">
                                {((showGrid || queue.length == 0) && !showingQueueGUI) ? 
                                <div>
                                    <div className="grid-container">
                                        <Grid isAbove showingStickie={showingStickie}/>
                                    </div> 
                                    <hr style={{ borderTop: "3px solid #000", borderRadius: "2px"}}/>
                                    <div className="grid-container">
                                        <Grid showingStickie={showingStickie}/>
                                    </div>
                                    <ColorsDisplay/>
                                </div>
                                : (
                                showingQueueGUI ? <SetQueue></SetQueue> : <Paper/>
                            )}
                            </div>
                        </Container>
                    </Split>
            )}
        </Container>
    )
}