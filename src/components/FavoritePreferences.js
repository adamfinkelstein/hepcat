import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { useChangeFavorites, useFavorites } from '../contexts/PreferencesContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'
import { useAppGlobals } from '../contexts/AppContext'

export default function FavoritePreferences(){
    let favorites = useFavorites()
    let changeFavorites = useChangeFavorites()

    let flasher = useFlasher()
    let flash = flasher["flash"]

    let controlledLog = useAppGlobals()["controlledLog"]

    function handleSubmit(event) {
        event.preventDefault();
        let newValues = []
        let values = event.target[0].value;
        values = values.replace("'","").replace(" ","") // remove quotes and spaces
        values = values.split(",")
        for(let i = 0; i < values.length; i++){
            const num = Number(values[i])
            controlledLog(num)
            if(!Number.isInteger(num)){
                flash("Favorites could not be updated. You supplied an invalid value.", "warning")
                return
            }
            newValues.push(num)
        }
        changeFavorites(oldFav => {
            let newSet = [...oldFav, ...newValues] // put them all together
            newSet = [...new Set(newSet)]; // use set to remove duplicates
            newSet.sort();
            controlledLog('update favorites set to:')
            controlledLog(newSet)
            return newSet
        })
        flash("Favorites are updated.", "success")
    }

    return(
        <Container className="favorite-preferences-container">
            <h3>Add Favorites</h3>
            <form onSubmit={handleSubmit}>
                <label>
                    Paper IDs:
                    <input type="text" name="favorites" className='favorites-input'/>
                </label>
                <button type="submit" className="btn btn-primary favorites-submit-btn">Add</button>
                <span className='example-favorites'>
                (Like '101' or '101,102,103'.)
                </span>
            </form>
            <Stack direction="horizontal" className="current-favorites-bar">
                <span><u>Current Favorites</u></span>
                <Button variant="warning" onClick={() => {
                    changeFavorites([])
                    flash("Favorites deleted.", "success")
                 }} className="delete-all-btn">Delete All</Button>
            </Stack>
            <ul className='current-favorites-container'>
                {
                    favorites.map((favorite, index) => {
                        return(
                            <li key={index}>
                                <Stack direction="horizontal" gap={3}>
                                    <span className='current-favorite-id'>{favorite}</span>
                                    <Button variant="light" onClick={() => {
                                        changeFavorites(oldFav => {
                                            return oldFav.filter((_, i) => i !== index)
                                        })
                                    }   
                                    } className="delete-btn">Delete</Button>
                                </Stack>
                            </li>
                        )
                    })
                }
            </ul>
        </Container>
    )
}