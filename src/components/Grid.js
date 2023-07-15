//import { Container } from "react-bootstrap";
import {useAppGlobals} from '../contexts/AppContext'
import { useFavorites } from '../contexts/PreferencesContext';
//import FavoritePreferences from './FavoritePreferences';

export default function Grid({isAbove,gridDisplay}){
    const globals = useAppGlobals();
    const user = globals.user;
    const queue = globals.queue;
    const grid = globals.grid;
    const aboveOrBelow = isAbove ? grid.above : grid.below;
    const notConflicted = aboveOrBelow.filter(
        // remove conflicted papers (and test paper) from grid
        paper => (paper.nid !== 9999 && !user.conflict_papers.includes(paper.nid)));
    const favorites = useFavorites()
    
    let queueCurrentID = 0 // none has 0 nid
    if(queue.length && globals.queueCurrent < queue.length && globals.queueCurrent >= 0){
        queueCurrentID = queue[globals.queueCurrent].nid
    }

    function gridClass(gridElem){
        let className = "grid-item";
        let paperStatus = gridElem.status
   
        if(gridDisplay === "Stickie"){
            if(gridElem.stickie){
                className += " stickie"
            }else{
                className += " non-stickie"
            }
        }
        else if(gridDisplay === "Favorites"){
            if(favorites.includes(gridElem.nid)){
                className += " " + paperStatus;
            }
            else{
                className += " non-stickie"
            }
            if(gridElem.stickie){
                className += " has-stickie"
            }
        }
        else{
            if(gridElem.nid === queueCurrentID){
                className += " Current"
            } else{
                className += " " + paperStatus
            }
            if(gridElem.stickie){
                className += " has-stickie"
            }
        }
        return className;
    }

    return(
        notConflicted.map((gridElem, index) => {
            return <div key={index} className={gridClass(gridElem)}><span className='font-size-4'>{gridElem.nid}</span></div>
        })
    )
}