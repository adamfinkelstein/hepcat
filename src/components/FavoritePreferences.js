import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import {
  useChangeFavorites,
  useFavorites,
} from '../contexts/PreferencesContext';

export default function FavoritePreferences() {
  const { controlledLog } = useControlledLog();
  const changeFavorites = useChangeFavorites();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { revealConfirmationBox } = useConfirmationBox();
  const globals = useAppGlobals();
  const checkValidNID = globals['checkValidNID'];
  const favorites = useFavorites();
  const showDeleteAny = favorites && favorites.length > 0;
  const showDeleteAll = favorites && favorites.length > 1;
  const deleteMsg = showDeleteAny
    ? 'Delete favorites:'
    : '(No current favorites.)';

  function combineFavorites(oldFav, newFav) {
    const both = [...oldFav, ...newFav];
    const uniq = new Set(both);
    const arr = [...uniq];
    arr.sort();
    controlledLog('update favorites set to:');
    controlledLog(arr);
    return arr;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const idBox = event.target[0];
    let ids = idBox.value;
    // replace non-digits with whitespace then split on whitespace
    ids = ids.replace(/[^\d]/g, ' ').trim().split(/\s+/);
    ids = ids.map((i) => parseInt(i));
    // check for valid IDs
    const badIDs = ids.filter((v) => !checkValidNID(v));
    if (!badIDs.length) {
      changeFavorites((oldFav) => combineFavorites(oldFav, ids));
      idBox.value = ''; // clear out the box
      flash('Favorites are updated.', 'success');
    } else {
      const bad = badIDs.join(',');
      const msg = 'Favorites not updated. One or more unknown IDs: ' + bad;
      revealModalDialog({ title: 'Error', message: msg });
    }
  }
  const handleDeleteButton = (removeID) => {
    let text = 'Are you sure you want to remove all favorites?';
    if (removeID) {
      text = 'Are you sure you want to remove favorite ' + removeID + '?';
    }
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        let msg = 'All favorites removed.';
        if (removeID) {
          msg = 'Favorite ' + removeID + ' removed.';
          changeFavorites((oldFav) => oldFav.filter((id) => id !== removeID));
        } else {
          // remove all
          changeFavorites([]);
        }
        controlledLog(msg);
        flash(msg, 'success');
      } else {
        const msg = 'Delete favorites button canceled.';
        controlledLog(msg);
        // flash(msg, 'warning'); // bad UX to flash on cancel
      }
    });
  };

  return (
    <Container className="FavoritePreferences">
      <div className="font-size-2">Favorites</div>
      <form onSubmit={handleSubmit}>
        <div className="form-group mt-3">
          <label className="font-size-4 mt-3">
            Enter Paper IDs, like '101' or '101 102 103' or '101,102,103':
          </label>
          <Stack direction="horizontal" gap={3}>
            <input type="text" name="favorites" className="favorites-input" />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </Stack>
        </div>
      </form>

      <Container className="DeleteFavorites mt-3">
        <span className="font-size-4 mr-2">{deleteMsg}</span>
        {showDeleteAll && (
          <Button
            className="mx-2"
            variant="danger"
            onClick={() => handleDeleteButton(0)}
          >
            Delete All
          </Button>
        )}
        {favorites.map((favorite, index) => {
          return (
            <Button
              key={index}
              className="mx-2"
              variant="warning"
              onClick={() => handleDeleteButton(favorite)}
            >
              {favorite}
            </Button>
          );
        })}
      </Container>
    </Container>
  );
}
