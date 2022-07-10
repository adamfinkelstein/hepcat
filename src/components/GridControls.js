import Stack from "react-bootstrap/Stack"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBorderAll } from '@fortawesome/free-solid-svg-icons'

export default function GridControls({showingStickie, setShowingStickie, showGrid, setShowGrid}){
    return(
        <Stack direction="horizontal" className="grid-controls">
            <button onClick={() => {setShowGrid(showGrid === true ? false : true)}}
                    type="button" className="btn btn-primary">
                <FontAwesomeIcon icon={faBorderAll} /><span style={{marginLeft: "10px"}}> {showGrid ? "Hide" : "Show"} Grid</span>
            </button>
            {
                showGrid && (
                    <button style={{marginLeft: "20px"}} 
                            onClick={() => {setShowingStickie(showingStickie === true ? false : true)}}
                            type="button" className="btn btn-primary">
                        <span>{showingStickie ? "Hide" : "Show"} Stickies</span>
                    </button>
                )
            }
        </Stack>
    )
}