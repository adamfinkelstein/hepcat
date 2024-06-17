import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import Button from 'react-bootstrap/Button';
import { useAppGlobals } from '../contexts/AppContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import {
  useChangeFavorites,
  useFavorites,
} from '../contexts/PreferencesContext';

export default function FavoritePreferences() {
  const { controlledLog } = useControlledLog();
  let favorites = useFavorites();
  let changeFavorites = useChangeFavorites();

  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();

  let globals = useAppGlobals();
  let checkValidNID = globals['checkValidNID'];

  function handleSubmit(event) {
    event.preventDefault();
    const idBox = event.target[0];
    let ids = idBox.value;
    // replace non-digits with whitespace then split on whitespace
    ids = ids.replace(/[^\d]/g, ' ').trim().split(/\s+/);
    ids = ids.map((i) => parseInt(i));
    // check for valid IDs
    const badIDs = ids.filter((v) => !checkValidNID(v));
    if (badIDs.length) {
      const bad = badIDs.join(',');
      const msg =
        'Favorites not updated. One or more ID(s) does not exist: ' + bad;
      revealModalDialog('Error', msg);
      return;
    }
    changeFavorites((oldFav) => {
      let newSet = [...oldFav, ...ids]; // put them all together
      newSet = [...new Set(newSet)]; // use set to remove duplicates
      newSet.sort();
      controlledLog('update favorites set to:');
      controlledLog(newSet);
      return newSet;
    });
    idBox.value = ''; // clear out the box
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
