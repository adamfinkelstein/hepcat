import Stack from "react-bootstrap/Stack"
import { useGlobals, useSocketEmit } from "../contexts/AppContext"
import DropdownButton from "react-bootstrap/DropdownButton"
import Dropdown from "react-bootstrap/Dropdown"
import {useState} from 'react'

// this var also in SetQueue - consolidate?
const statusList = ['Tabled','Reject','Conference','Journal'];

export default function AdminQueueControls(){
    let socketEmit = useSocketEmit()
    let globals = useGlobals()
    let [newStatus, setNewStatus] = useState("Reject")
    return(
        <Stack direction="horizontal" className="AdminQueueControls">
            <button
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_prev_paper")
                    }}
            >
            Prev
            </button>
            <button 
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_next_paper")
                    }}>
            Show
            </button>
            <button
                    type="button" className="btn btn-light paper-change-button" onClick={()=>{
                        socketEmit("admin_show_current")
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
                                    <div className={"rectangle" + " " + newStatus.toLowerCase()}/>
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