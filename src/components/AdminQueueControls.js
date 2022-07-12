import Stack from "react-bootstrap/Stack"
import { useGlobals, useSocketEmitContext } from "../contexts/AppContext"
import DropdownButton from "react-bootstrap/DropdownButton"
import Dropdown from "react-bootstrap/Dropdown"
import {useState} from 'react'

export default function AdminQueueControls(){
    let socketEmit = useSocketEmitContext()
    let globals = useGlobals()
    let [newStatus, setNewStatus] = useState("Reject")
    return(
        <Stack direction="horizontal" className="AdminQueueControls">
            <button
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_prev_paper")
                    }}
            >
               &lt; Previous
            </button>
            <button 
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_next_paper")
                    }}>
                Show Paper
            </button>
            <button
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_show_paper")
                    }}>
                Next &gt;
            </button>
            <DropdownButton id="dropdown-item-button" title={newStatus} className="new-status-dropdown">
                {
                    ["Reject", "Conference", "Journal", "Table"].map((newStatus, index) => {
                        return <Dropdown.Item key={index} as="button" onClick={() => setNewStatus(newStatus)}>{newStatus}</Dropdown.Item>
                    })
                }
            </DropdownButton>
        </Stack>
    )
}