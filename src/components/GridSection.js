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

export default function GridSection(){
    const [gridDisplay, setGridDisplay] = useState("Normal");
    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;
    let controlledLog = useAppGlobals()["controlledLog"]

    const stickieOptions = [
        "Tabled (Needs discussion)", 
        "Reject (Converged)", 
        "Conference (Converged)", 
        "Journal (Converged)"]
    const [stickie, setStickie] = useState(stickieOptions[0])
    const [ID, setID] = useState("")

    function sendStickie() {
        const words = stickie.split(' ');
        const status = words[0];
        const nid = parseInt(ID);
        if(!nid){
            alert("Please choose a paper id.");
            return;
        }
        controlledLog("Send stickie " + status + " to paper with id: " + nid);
        const data = {status, nid};
        socketEmit('user_set_stickie', data);
    }

    return(
        <Container>
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
            <div className="grid-container">
                <Grid isAbove gridDisplay={gridDisplay}/>
            </div> 
            <hr className="horizontal-divider"/>
            <div className="grid-container">
                <Grid gridDisplay={gridDisplay}/>
            </div>
            <Stack direction="horizontal">
                <ColorsDisplay/>
                <hr className="vertical-divider"></hr>
                <Container className="set-stickie">
                    <Stack direction = "vertical" className="send-stickie-column">
                        <div className="stickie-step">Step 1 &mdash; choose a stickie type:</div>
                        <ChooseStatusDropdown currentStatus={stickie} setValue={setStickie}/>
                        <div className="stickie-step">Step 2 &mdash; type the numeric paper ID:</div>
                        <div>
                        <input maxLength={3}
                            name="id"
                            onChange={(event) => { setID(event.target.value) }}
                        />
                        </div>
                        <div className="stickie-step">Step 3 &mdash; click to send stickie:</div>
                        <Button variant="primary" onClick={sendStickie}>Send Stickie</Button>
                    </Stack>
                </Container>
            </Stack>
        </Container>
    )
}