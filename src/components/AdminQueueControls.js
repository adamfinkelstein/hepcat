import Stack from "react-bootstrap/Stack"
import { useSocketEmitContext } from "../contexts/AppContext"
export default function AdminQueueControls(){
    let socketEmit = useSocketEmitContext()
    return(
        <Stack direction="horizontal">
            <button
                    type="button" className="btn btn-primary" onClick={()=>{
                        socketEmit("admin_prev_paper")
                    }}>
                Previous
            </button>
            <button 
                    type="button" className="btn btn-primary" onClick={()=>{
                        socketEmit("admin_next_paper")
                    }}>
                Show Paper
            </button>
            <button
                    type="button" className="btn btn-primary" onClick={()=>{
                        socketEmit("admin_show_paper")
                    }}>
                Next
            </button>
        </Stack>
    )
}