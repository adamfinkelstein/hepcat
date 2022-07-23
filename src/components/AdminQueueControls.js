import Stack from "react-bootstrap/Stack"
import { useAppGlobals } from "../contexts/AppContext"
//import DropdownButton from "react-bootstrap/DropdownButton"
import ChooseStatusDropdown from './ChooseStatusDropdown.js'

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
            <ChooseStatusDropdown currentStatus={newStatus} setValue={setNewStatus}/>
        </Stack>
    )
}