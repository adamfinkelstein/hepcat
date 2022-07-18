import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import { useChangeFavorites, useFavorites } from '../contexts/PreferencesContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'

export default function FavoritePreferences(){
    let favorites = useFavorites()
    let changeFavorites = useChangeFavorites()

    let flasher = useFlasher()
    let flash = flasher["flash"]


    function handleSubmit(event) {
        event.preventDefault();

        let value = event.target[0].value;

        let values = value.split(",")
        let newValues = []
        for(let i = 0; i < values.length; i++){
            const num = Number(values[i].trim())
            console.log(num)
            if(!Number.isInteger(num)){
                flash("Favorites could not be updated. You supplied an invalid value.", "warning")
                return
            }
            else if(favorites.includes(num)){
                flash("Favorites could not be updated. You supplied an id that is already in your favorites.", "warning")
                return
            }
            else if(newValues.includes(num)){
                flash("Favorites could not be updated. You supplied a duplicate value.", "warning")
                return
            }
            newValues.push(num)
        }
        changeFavorites(oldFav => {
            console.log(newValues)
            return [...oldFav, ...newValues]
        })
        flash("Favorites are updated.", "success")
    }

    return(
        <Container className="favorite-preferences-container">
            <h3>Add Favorites</h3>
            <form onSubmit={handleSubmit}>
                <label>
                    New Favorites:
                    <input type="text" name="favorites" className='favorites-input'/>
                </label>
                <input type="submit" value="Submit" className='favorites-submit-btn'/>
                <span className='example-favorites'>
                    Like '100' or list of paper ids '100, 101, ...''
                </span>
            </form>
            <Stack direction="horizontal" className="current-favorites-bar">
                <span>Current Favorites</span>
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