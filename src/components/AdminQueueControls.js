import Stack from "react-bootstrap/Stack"
import { useAppGlobals } from "../contexts/AppContext"
import DropdownButton from "react-bootstrap/DropdownButton"
import Dropdown from "react-bootstrap/Dropdown"
import {useState} from 'react'

// this var also in SetQueue - consolidate?
const statusList = ['Tabled','Reject','Conference','Journal'];

export default function AdminQueueControls() {
    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;
    const [newStatus, setNewStatus] = useState("Reject");
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

            <DropdownButton id="status-dropdown-menu" title={newStatus}
                    variant="outline">
                {
                    statusList.map((newStatus, index) => {
                        return(
                            <Dropdown.Item as="button" key={index}
                                onClick={() => setNewStatus(newStatus)}>
                                <Stack direction="horizontal">
                                    <div className={"rectangle " + newStatus}/>
                                    <span>{newStatus}</span>
                                </Stack>
                            </Dropdown.Item>
                        )
                    })
                    
                }
            </DropdownButton>
        </Stack>
    )
}