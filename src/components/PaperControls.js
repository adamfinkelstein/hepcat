import Stack from "react-bootstrap/Stack"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBorderAll } from '@fortawesome/free-solid-svg-icons'

export default function GridControls({showingStickie, setShowingStickie, showGrid, setShowGrid}){
    return(
        <Stack direction="horizontal">
            <button onClick={() => {setShowGrid(showGrid === true ? false : true)}}>
                <FontAwesomeIcon icon={faBorderAll} /><span> {showGrid ? "Hide" : "Show"} Grid</span>
            </button>
            {
                showGrid && (
                    <button onClick={() => {
                        setShowingStickie(showingStickie === true ? false : true)
                        }}>
                        <span>{showingStickie ? "Hide" : "Show"} Stickies</span>
                    </button>
                )
            }
        </Stack>
    )
}