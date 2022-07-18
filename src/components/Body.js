import Container from 'react-bootstrap/Container'
import Split from 'react-split';
import {useAppGlobals} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Queue from './Queue'
import Paper from './Paper'
import GridSection from './GridSection'
import SetQueue from './SetQueue';
import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

export default function Body(){
    const globals = useAppGlobals();
    const user = globals.user;
    const queue = globals.queue;

    const flasher = useFlasher()
    //const flash = flasher["flash"]
    const visible = flasher["visible"]
    const hideFlash = flasher["hideFlash"];
    const flashMessage = flasher["flashMessage"]

    // function createGridCSS(){
    //     return "repeat(" + (Math.floor(gridSize / 4)) + ", 40px)"
    // }

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
                            <Tabs defaultActiveKey="paper"
                                  id="uncontrolled-tab-example"
                                  className="mb-3">
                                <Tab eventKey="paper" title="Paper">
                                    <Paper />
                                </Tab>
                                <Tab eventKey="grid" title="Grid">
                                    <GridSection />
                                </Tab>
                                {
                                    user && user.role_name === "Admin" && (
                                        <Tab eventKey="admin" title="Admin Controls">
                                            <SetQueue/>
                                        </Tab>
                                    )
                                }
                            </Tabs>
                        </Container>
                    </Split>
            )}
        </Container>
    )
}