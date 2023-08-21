import moment from 'moment';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useAppGlobals } from '../contexts/AppContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

export default function UploadsPage() {
  let flasher = useFlasher();
  let flash = flasher['flash'];

  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { user, adminKey } = useUser();
  const isSuper = user && user.role_name === 'Super';
  const globals = useAppGlobals();
  const fileUploads = globals.fileUploads;
  const uploadList = fileUploads ? fileUploads.uploads : [];
  const pendingList = fileUploads ? fileUploads.pending : [];
  const uploadTitle = uploadList.length
    ? 'Uploaded Files:'
    : 'No files uploaded yet.';
  const pendingTitle = pendingList.length
    ? 'Pending Files:'
    : 'No files pending.';

  function handleSubmit(event) {
    event.preventDefault();
    const fileUp = document.getElementById('form-file-upload');
    if (!fileUp.value) return;
    const file = fileUp.files[0];
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext !== 'csv') {
      const msg =
        "The file '" + fileName + "' does not appear to be a CSV file.";
      flash(msg, 'warning');
      fileUp.value = null; // reset the upload
      return;
    }
    controlledLog('sending file:');
    controlledLog(file);
    socketEmit('admin_file_upload', file);
    fileUp.value = null; // reset the upload
  }

  function formatUpload(upload) {
    const when = moment.utc(upload.when).local().format('llll');
    const fmt = upload.file + ' (' + upload.count + ' uploaded ' + when + ')';
    return fmt;
  }

  function handleWipeDBButton() {
    controlledLog('Wipe DB button pressed.');
    let text =
      'Are you really, Really, REALLY sure you want to wipe out the database?';
    if (window.confirm(text) === true) {
      controlledLog('Wipe DB button confirmed. Redirect.');
      window.location.href = '/admin/wipe_database/' + adminKey;
    } else {
      controlledLog('Wipe DB button canceled.');
    }
  }

  function handleAddTestPaper() {
    controlledLog('admin_add_test_paper button pressed.');
    socketEmit('admin_add_test_paper');
  }

  function handleBringToAllRooms() {
    controlledLog('admin_bring_to_all_rooms button pressed.');
    socketEmit('admin_bring_to_all_rooms');
  }

  return (
    <Container className="titled-page">
      <span className="font-size-1">Upload CSV Files Here</span>
      <Container className="change-password-main-container">
        <Form>
          <Form.Group controlId="form-file-upload" className="mb-3">
            <Form.Label>Choose a CSV file:</Form.Label>
            <Form.Control type="file" />
          </Form.Group>
        </Form>

        <Stack direction="horizontal">
          <div>
            <button
              type="submit"
              className="btn btn-primary reset-password-button"
              onClick={(e) => handleSubmit(e)}
            >
              Send File
            </button>
          </div>
        </Stack>
        <p>&nbsp;</p>
        <span className="font-size-2">{pendingTitle}</span>
        <ul>
          {pendingList.map((item) => {
            return (
              <li key={item} className="file-list-item">
                {item}
              </li>
            );
          })}
        </ul>
        <span className="font-size-2">{uploadTitle}</span>
        <ul>
          {uploadList.map((item) => {
            return (
              <li key={item.file} className="file-list-item">
                {formatUpload(item)}
              </li>
            );
          })}
        </ul>

        <div>
          <p>&nbsp;</p>
          <hr />
          <p>&nbsp;</p>
          <span className="font-size-2">Extra Admin Functions</span>
        </div>

        <Stack className="space-down-btn" direction="horizontal">
          <Button variant="primary" onClick={handleAddTestPaper}>
            Add Test Paper
          </Button>
          &nbsp;&nbsp;This adds Papers_9999, conflicted with all users for
          testing conflictbot.
        </Stack>

        <Stack className="space-down-btn" direction="horizontal">
          <Button variant="primary" onClick={handleBringToAllRooms}>
            Bring to All Rooms
          </Button>
          &nbsp;&nbsp;This tells Conflictbot to bring everyone to the room they
          belong in.
        </Stack>

        <Stack className="space-down-btn" direction="horizontal">
          <a
            className="btn btn-primary"
            href={'/admin/zoom_conflictbot/' + adminKey}
            target="_blank"
            rel="noopener noreferrer"
          >
            Zoom Conflictbot
          </a>
          &nbsp;&nbsp;Open Zoom Conflictbot in new tab.
        </Stack>

        <Stack className="space-down-btn" direction="horizontal">
          <a
            className="btn btn-primary"
            href={'/admin/download_csv/queries/' + adminKey}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Queries
          </a>
          &nbsp;&nbsp;Download a CSV with current queries.
        </Stack>

        <Stack className="space-down-btn" direction="horizontal">
          <a
            className="btn btn-warning"
            href={'/admin/download_csv/results/' + adminKey}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Results
          </a>
          &nbsp;&nbsp;Download a CSV with the final status of all papers.
        </Stack>

        <Stack className="space-down-btn" direction="horizontal">
          <a
            className="btn btn-warning"
            href={'/admin/download_zip/' + adminKey}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download ZIP
          </a>
          &nbsp;&nbsp;Download a ZIP containing CSVs describing database.
        </Stack>

        {isSuper && (
          <Stack className="space-down-btn" direction="horizontal">
            <Button variant="danger" onClick={handleWipeDBButton}>
              Wipe Database Clean
            </Button>
            &nbsp;&nbsp;This removes ALL data from the database!
          </Stack>
        )}
      </Container>
    </Container>
  );
}
