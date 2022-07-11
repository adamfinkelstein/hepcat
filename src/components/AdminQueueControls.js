import Stack from "react-bootstrap/Stack"
export default function AdminQueueControls(){
    return(
        <Stack direction="horizontal">
            <button
                    type="button" className="btn btn-primary">
                Previous
            </button>
            <button 
                    type="button" className="btn btn-primary">
                Show Paper
            </button>
            <button
                    type="button" className="btn btn-primary">
                Next
            </button>
        </Stack>
    )
}