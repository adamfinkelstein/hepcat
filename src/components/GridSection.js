import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import Grid from './Grid.js'
import {useState} from 'react'
import { useAppGlobals } from "../contexts/AppContext"
import ColorsDisplay from './ColorsDisplay';
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'
import ChooseStatusDropdown from './ChooseStatusDropdown.js'
import {useFlasher} from '../contexts/FlasherContext'
import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';

export default function GridSection(){
    const [gridDisplay, setGridDisplay] = useState("Normal");
    const globals = useAppGlobals();
    const guiBar = globals.guiBar
    const grid = globals.grid
    const gridCountAbove = grid && grid.above ? grid.above.length : 0
    const gridCountBelow = grid && grid.below ? grid.below.length : 0
    const papersTotal = gridCountAbove + gridCountBelow
    const socketEmit = globals.socketEmit
    const controlledLog = globals.controlledLog
    const checkValidNID = globals.checkValidNID
    const setModalTitle = globals.setModalTitle
    const setModalBody = globals.setModalBody
    const setShowModal = globals.setShowModal
    const [stickie, setStickie] = useState("Tabled")
    const [ID, setID] = useState("")

    let flasher = useFlasher()
    let visible = flasher["visible"]
    let hideFlash = flasher["hideFlash"];
    let flashMessage = flasher["flashMessage"]

    function sendStickie() {
        const words = stickie.split(' ');
        const status = words[0];
        const nid = parseInt(ID);
        controlledLog(nid);
        if(!checkValidNID(nid)){
            setModalTitle("ERROR");
            setModalBody("Please choose a valid paper id.");
            setShowModal(true);
            return;
        }
        controlledLog("Send stickie " + status + " to paper with id: " + nid);
        const data = {status, nid};
        socketEmit('user_set_stickie', data);
        // now stickie confirmation sent from server
        // flash("Stickie sent for " + nid + " with " + status + ".", "success", "stickie")
    }

    return(
        <Container>
            <Stack direction="horizontal">
            <div className="font-size-3">Bar: {guiBar} 
                &nbsp;&nbsp; Above: {gridCountAbove}
                &nbsp;&nbsp; Below: {gridCountBelow}
                &nbsp;&nbsp; Total: {papersTotal}
            </div>
            <DropdownButton id="dropdown-item-button" 
                            title={gridDisplay}
                            variant="secondary" className='grid-display-dropdown'>
                {
                    ["Normal", "Stickie", "Favorites"].map((gridDisplay, index) => {
                        return(
                            <Dropdown.Item key={index} as="button" onClick={() => setGridDisplay(gridDisplay)}>{gridDisplay}</Dropdown.Item>
                        )
                    })
                }
            </DropdownButton>
            </Stack>
            <div className="grid-container">
                <Grid isAbove gridDisplay={gridDisplay}/>
            </div> 
            <hr className="horizontal-divider"/>
            <div className="grid-container">
                <Grid gridDisplay={gridDisplay}/>
            </div>
            <hr className="horizontal-divider"/>
            <Collapse in={visible["stickie"]}>
                <div>
                    <Alert variant={flashMessage.type || 'info'} dismissible
                    onClose={hideFlash}>
                        {flashMessage.message}
                    </Alert>
                </div>
            </Collapse>
            <Stack direction="horizontal">
                <ColorsDisplay/>
                <hr className="vertical-divider"></hr>
                <Container className="set-stickie">
                    <Stack direction = "vertical" className="send-stickie-column">
                        <p className="stickie-step font-size-3">Step 1 &mdash; choose a stickie type:</p>
                        <ChooseStatusDropdown currentStatus={stickie} setValue={setStickie}/>
                        <p className="stickie-step font-size-3">Step 2 &mdash; type the numeric paper ID:</p>
                        <div>
                            <input maxLength={3}
                                name="id"
                                onChange={(event) => { setID(event.target.value) }}
                            />
                        </div>
                        <p className="stickie-step font-size-3">Step 3 &mdash; click to send stickie:</p>
                        <Button variant="primary" onClick={sendStickie}>Send Stickie</Button>
                    </Stack>
                </Container>
            </Stack>
        </Container>
    )
}