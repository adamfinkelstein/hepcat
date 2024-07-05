import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import {
  useChangeFavorites,
  useFavorites,
} from '../contexts/PreferencesContext';
import ButtonX from './ButtonX';

export default function FavoritePreferences() {
  const { controlledLog } = useControlledLog();
  const changeFavorites = useChangeFavorites();
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { revealConfirmationBox } = useConfirmationBox();
  const globals = useAppGlobals();
  const checkValidNID = globals['checkValidNID'];
  const favorites = useFavorites();
  const showDelete = favorites && favorites.length > 1;

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
      revealModalDialog('Error', msg);
    }
  }
  const handleDeleteButton = () => {
    const text = 'Are you sure you want to remove all favorites?';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        const msg = 'All favorites removed.';
        controlledLog(msg);
        flash(msg, 'success');
        changeFavorites([]);
      } else {
        const msg = 'Delete favorites button canceled.';
        controlledLog(msg);
        flash(msg, 'warning');
      }
    });
  };

  const handleXOneFavButton = (removeID) => {
    const msg = 'One favorite removed:' + removeID;
    controlledLog(msg);
    flash(msg, 'success');
    changeFavorites((oldFav) => oldFav.filter((id) => id !== removeID));
  };

  return (
    <Container className="favorite-preferences-container">
      <div className="font-size-2">Favorites</div>
      <div className="example-favorites font-size-4">
        Enter Paper IDs, like '101' or '101,102,103':
      </div>
      <form onSubmit={handleSubmit}>
        <input type="text" name="favorites" className="favorites-input" />
        <button
          type="submit"
          className="btn btn-primary favorites-submit-btn font-size-4"
        >
          Add
        </button>
      </form>

      <Container gap={4}>
        {showDelete && (
          <Button
            variant="danger"
            onClick={handleDeleteButton}
            className="current-favorite delete-all-btn font-size-4"
          >
            Delete All
          </Button>
        )}
        <>
          {favorites.map((favorite, index) => {
            return (
              <ButtonX
                key={index}
                label={favorite}
                handleClick={() => handleXOneFavButton(favorite)}
              />
            );
          })}
        </>
      </Container>
    </Container>
  );
}
