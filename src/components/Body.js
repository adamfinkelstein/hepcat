import Container from 'react-bootstrap/Container'
import Split from 'react-split';
import {useQueue, useUser} from '../contexts/AppContext'
import Queue from './Queue'
import Paper from './Paper'
import Grid from './Grid'
import {useState} from 'react'
import GridControls from './GridControls';
import ColorsDisplay from './ColorsDisplay';
import SetQueue from './SetQueue';

export default function Body(){
    const queue = useQueue()
    const user = useUser()

    const [showGrid, setShowGrid] = useState(false);
    const [showingStickie, setShowingStickie] = useState(false);
    const [showingQueueGUI, setShowingQueueGUI] = useState(false);
    const [gridSize, setGridSize] = useState(60);

    function createGridCSS(){
        return "repeat(" + (Math.floor(gridSize / 4)) + ", 40px)"
    }

    return(
        <Container>
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
                            {queue.length ? <Queue/> : <div>No papers in queue.</div>}
                        </Container>
                        <Container>
                            <GridControls showingStickie={showingStickie} setShowingStickie={setShowingStickie} 
                                          showGrid={showGrid} setShowGrid={setShowGrid}
                                          showingQueueGUI={showingQueueGUI} setShowingQueueGUI={setShowingQueueGUI}/>
                            <div className="right-panel-container">
                                {((showGrid || queue.length == 0) && !showingQueueGUI) ? 
                                <div>
                                    <div className="grid-container">
                                        <Grid showingStickie={showingStickie}/>
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