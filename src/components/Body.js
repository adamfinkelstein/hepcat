import {useState, useEffect} from 'react'
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
import moment from 'moment'

export default function Body(){
    const globals = useAppGlobals();
    const user = globals.user;
    const queue = globals.queue;

    const flasher = useFlasher()
    //const flash = flasher["flash"]
    const visible = flasher["visible"]
    const hideFlash = flasher["hideFlash"];
    const flashMessage = flasher["flashMessage"]

    const [currentTime, setCurrentTime] = useState(Date.now());
    const isPaper = queue && queue.length && globals.queueCurrent < queue.length;
    const currentShow = isPaper && globals.serverGlobs.current_show;
    const currentStart = isPaper && globals.serverGlobs.current_start

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);

    function dateToSecs(date) {
        return moment.utc(date).local().unix()
    }
    function formatTime(date) {
        const sec1 = dateToSecs(currentStart)
        const sec2 = dateToSecs(date)
        const msDiff = Math.max(0, sec2 - sec1) * 1000
        const format = moment.utc(msDiff).format('mm:ss');
        return format
    }

    return(
        <Container className='Body'>
            {(!user) ? (
                <p id="waiting-for-server">Waiting for server connection...</p>
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
                                  id="paper-tabs"
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
                                {
                                    currentShow &&
                                    (<Tab tabClassName="timer-tab" title={formatTime(currentTime)} className="foofoo" disabled></Tab>)
                                }
                            </Tabs>
                        </Container>
                    </Split>
            )}
        </Container>
    )
}