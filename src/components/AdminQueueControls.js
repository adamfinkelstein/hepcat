import Stack from "react-bootstrap/Stack"
import { useAppGlobals } from "../contexts/AppContext"
//import DropdownButton from "react-bootstrap/DropdownButton"
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from "react-bootstrap/Dropdown"
// import {useState} from 'react'

// this var also in SetQueue - consolidate?
const statusList = ['Tabled','Reject','Conference','Journal'];

export default function AdminQueueControls() {
    const globals = useAppGlobals();
    const newStatus = globals.newStatus;
    const setNewStatus = globals.setNewStatus;
    const socketEmit = globals.socketEmit;
    const completed = globals.queueCurrent >= globals.queue.length;
    const disablePrev = globals.queueCurrent === 0 ? "disabled" : "";
    const disableShow = completed || globals.serverGlobs.current_show ? "disabled" : "";
    const disableNext = completed ? "disabled" : "";

    return(
        <Stack direction="horizontal" className="AdminQueueControls">
            <button disabled={disablePrev}
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_prev_paper")
                    }}
            >
            Prev
            </button>
            <button disabled={disableShow}
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_show_current")
                    }}>
            Show
            </button>
            <button disabled={disableNext}
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_next_paper", newStatus)
                    }}>
            Next
            </button>

            <Dropdown as={ButtonGroup} id="status-dropdown-menu">
            <Button variant="outline">
            <Stack direction="horizontal">
                <div className={"rectangle " + newStatus}/>
                <span>{newStatus}</span>
            </Stack>
            </Button>
            <Dropdown.Toggle split variant="outline" id="dropdown-split-basic" />

            <Dropdown.Menu>
                {
                    statusList.map((status, index) => {
                        return(
                            <Dropdown.Item as="button" key={index}
                                onClick={() => setNewStatus(status)}>
                                <Stack direction="horizontal">
                                    <div className={"rectangle " + status}/>
                                    <span>{status}</span>
                                </Stack>
                            </Dropdown.Item>
                        )
                    })
                    
                }
            </Dropdown.Menu>
            </Dropdown>
        </Stack>
    )
}