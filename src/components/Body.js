import Container from 'react-bootstrap/Container'
import Split from 'react-split'
import {useAppGlobals} from '../contexts/AppContext'
import Queue from './Queue'
import Paper from './Paper'
import GridSection from './GridSection'
import SetQueue from './SetQueue'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'
import { useSplitWidth, useChangeSplitWidth } from '../contexts/PreferencesContext'

export default function Body(){
    const globals = useAppGlobals()
    const user = globals.user
    const isAdmin = user && user.role_name === "Admin"
    const isScreen = user && user.role_name === "Screen"
    const queue = globals.queue

    const isPaper = queue && queue.length && globals.queueCurrent < queue.length
    const hideQueue = !isAdmin && globals.serverGlobs && globals.serverGlobs.hide_queue
    const hideMessage = globals.serverGlobs && globals.serverGlobs.message ? globals.serverGlobs.message : "The queue is hidden."
    const message = hideQueue ? hideMessage : "No papers in queue."

    const splitWidth = useSplitWidth()
    const changeSplitWidth = useChangeSplitWidth()

    return(
        <Container fluid className='Body'>
            {(!user) ? (
                <p id="waiting-for-server">Waiting for server connection...</p>
            ) : (
                    <Split 
                    direction='horizontal'
                    className='split'
                    sizes={[splitWidth[0], splitWidth[1]]}
                    cursor="col-resize"
                    minSize={[500, 550]}
                    onDragEnd={(sizes) => changeSplitWidth(sizes)}
                    >
                        <Container className='left-panel'>
                            { queue.length && !hideQueue ? 
                                <Queue/> 
                                : 
                                <div id="noPapersInQueue">{message}</div>
                            }
                        </Container>
                        <Container className='right-panel'>
                            <Tabs defaultActiveKey="paper"
                                  id="paper-tabs"
                                  className="mb-3 font-size-3 tabs">
                                <Tab eventKey="paper" title="Paper" className='tab'>
                                    <Paper />
                                </Tab>
                                {
                                    !isScreen && (
                                        <Tab eventKey="grid" title="Grid" className='tab'>
                                            <GridSection />
                                        </Tab>
                                    )
                                }
                                {
                                    isAdmin && (
                                        <Tab eventKey="admin" title="Admin Controls" className='tab'>
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