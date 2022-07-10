import { Container } from "react-bootstrap";
import {useGlobals, useGrid} from '../contexts/AppContext'

export default function Grid({showingStickie}){
    const grid = useGrid()
    const globals = useGlobals()

    function gridClass(gridElem){
        let className = "grid-item";
        let paperStatus = gridElem.status
        if(showingStickie){
            if(paperStatus.stickie){
                className += " stickie"
            }else{
                className += " non-stickie"
            }
        }
        else{
            if(gridElem.nid === globals.queueCurrent){
                className += " current"
            }
            else{
                switch(paperStatus){
                    case "U":
                        className += " untouched"
                        break;
                    case "R":
                        className += " reject"
                        break;
                    case "C":
                        className += " conference"
                        break;
                    case "T":
                        className += " tabled"
                        break;
                    case "J":
                        className += " journal"
                        break;
                    default:
                        className += " untouched"
                        break;
                }
            }
        }
        return className;
    }

    return(
        grid.map((gridElem, index) => {
            return <div key={index} className={gridClass(gridElem)}>{gridElem.nid}</div>
        })
    )
}