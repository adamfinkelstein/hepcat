import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import {
  useChangeFavorites,
  useFavorites,
} from '../contexts/PreferencesContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import Button from 'react-bootstrap/Button';
import { useAppGlobals } from '../contexts/AppContext';

export default function FavoritePreferences() {
  const { controlledLog } = useControlledLog();
  let favorites = useFavorites();
  let changeFavorites = useChangeFavorites();

  let flasher = useFlasher();
  let flash = flasher['flash'];

  let globals = useAppGlobals();
  let checkValidNID = globals['checkValidNID'];

  function handleSubmit(event) {
    event.preventDefault();

    let newValues = [];
    let values = event.target[0].value;
    values = values.replace("'", '').replace(' ', ''); // remove quotes and spaces
    values = values.split(',');
    for (let i = 0; i < values.length; i++) {
      const num = Number(values[i]);
      controlledLog(num);
      if (!Number.isInteger(num)) {
        flash(
          'Favorites could not be updated. You supplied an invalid value.',
          'warning',
          'favorites',
        );
        return;
      } else if (!checkValidNID(num)) {
        flash(
          "Favorites could not be updated. You supplied a paper ID that doesn't exist.",
          'warning',
          'favorites',
        );
        return;
      }
      newValues.push(num);
    }
    changeFavorites((oldFav) => {
      let newSet = [...oldFav, ...newValues]; // put them all together
      newSet = [...new Set(newSet)]; // use set to remove duplicates
      newSet.sort();
      controlledLog('update favorites set to:');
      controlledLog(newSet);
      return newSet;
    });

    let input = document.getElementsByClassName('favorites-input')[0];

    input.value = '';
    flash('Favorites are updated.', 'success');
  }

  return (
    <Container className="favorite-preferences-container">
      <span className="font-size-2">Favorites</span>
      <form onSubmit={handleSubmit}>
        <label className="font-size-3">
          Paper IDs:
          <input type="text" name="favorites" className="favorites-input" />
        </label>
        <button type="submit" className="btn btn-primary favorites-submit-btn">
          Add
        </button>
        <span className="example-favorites font-size-4">
          (Like '101' or '101,102,103'.)
        </span>
      </form>
      <Stack direction="horizontal" className="current-favorites-bar">
        <span className="font-size-3">
          <u>Current Favorites</u>
        </span>
        <Button
          variant="danger"
          onClick={() => {
            changeFavorites([]);
            flash('Favorites deleted.', 'success');
          }}
          className="delete-all-btn"
        >
          Delete All
        </Button>
      </Stack>
      <ul className="current-favorites-container">
        {favorites.map((favorite, index) => {
          return (
            <li key={index} className="favorites-list">
              <Stack direction="horizontal" gap={1}>
                <Button
                  variant="danger"
                  onClick={() => {
                    changeFavorites((oldFav) => {
                      return oldFav.filter((_, i) => i !== index);
                    });
                  }}
                  className="delete-btn"
                >
                  x
                </Button>
                <span className="current-favorite-id font-size-4">
                  {favorite}
                </span>
              </Stack>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
