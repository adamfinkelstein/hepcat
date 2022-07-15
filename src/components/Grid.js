import { Container } from "react-bootstrap";
import {useGlobals, useUser, useGrid} from '../contexts/AppContext'

export default function Grid({isAbove,showingStickie}){
    const user = useUser();
    const grid = useGrid();
    const globals = useGlobals();
    const aboveOrBelow = isAbove ? grid.above : grid.below;
    const notConflicted = aboveOrBelow.filter(
        paper => !user.conflict_papers.includes(paper.nid));

    function gridClass(gridElem){
        let className = "grid-item";
        let paperStatus = gridElem.status
        if(showingStickie){
            if(gridElem.stickie){
                className += " stickie"
            }else{
                className += " non-stickie"
            }
        }
        else{
            if(gridElem.queue_order === globals.queueCurrent + 1){
                className += " current"
            }
            else{
                switch(paperStatus){
                    case "U":
                        className += " unseen"
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
                        className += " unseen"
                        break;
                }
            }
        }
        return className;
    }

    return(
        notConflicted.map((gridElem, index) => {
            return <div key={index} className={gridClass(gridElem)}>{gridElem.nid}</div>
        })
    )
}