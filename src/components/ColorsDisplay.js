import { Container } from "react-bootstrap";
import Stack from 'react-bootstrap/Stack'
import { useColors } from "../contexts/ColorContext";

export default function ColorsDisplay({clickable, setPickingFor}){

    let colors = useColors()

    function toTitleCase(str) {
        return str.replace(
          /\w\S*/g,
          function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          }
        );
    }

    return(
        <Container className="grid_legend">
            <ul>
            {        
                Object.keys(colors).map(key => {
                    return (
                        <li key={key} className="legend-container">
                            <Stack direction="horizontal">
                                <div className={"rectangle" + " " + key} 
                                     onClick={() => {if(clickable){setPickingFor(key)}}}>
                                </div>
                                <span>{toTitleCase(key)}</span>
                            </Stack>
                        </li>
                    )
                })
            }
            </ul>
        </Container>
    )
}