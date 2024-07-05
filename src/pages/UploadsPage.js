import moment from 'moment';
import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import { useAppGlobals } from '../contexts/AppContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

export default function UploadsPage() {
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { revealConfirmationBox } = useConfirmationBox();

  const { controlledLog } = useControlledLog();
  const { socketEmit, socketLogout } = useSocketIO();
  const { user, adminKey, conflictbot } = useUser();
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
      // flash(msg, 'warning');
      revealModalDialog('Upload Error', msg);
      fileUp.value = null; // reset the upload
      return;
    }
    controlledLog('sending file:');
    controlledLog(file);
    socketEmit('admin_file_upload', file);
    fileUp.value = null; // reset the upload
    const msg = "Sent file '" + fileName + "' for upload...";
    flash(msg, 'success');
  }

  function formatUpload(upload) {
    const when = moment.utc(upload.when).local().format('llll');
    const fmt = upload.file + ' (' + upload.count + ' uploaded ' + when + ')';
    return fmt;
  }

  function handleWipeDBButton(isLoad) {
    const verb = isLoad ? 'load' : 'wipe';
    const text =
      'Are you really, Really, REALLY sure you want to ' +
      verb +
      ' the database?';
    controlledLog(verb + ' DB button pressed.');
    const socketMsg = 'admin_' + verb + '_database';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        controlledLog('confirmed: ' + socketMsg);
        socketEmit(socketMsg);
        socketLogout(true);
      } else {
        controlledLog('canceled: ' + socketMsg);
        const msg = 'Button canceled.';
        flash(msg, 'warning');
      }
    });
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
        {conflictbot && (
          <Stack className="space-down-btn" direction="horizontal">
            <a
              className="btn btn-primary"
              href={'/admin/conflictbot3/' + adminKey}
              target="_blank"
              rel="noopener noreferrer"
            >
              New Conflictbot3
            </a>
            &nbsp;&nbsp;Open Zoom Conflictbot3 in new tab.
          </Stack>
        )}
        {conflictbot && (
          <Stack className="space-down-btn" direction="horizontal">
            <a
              className="btn btn-primary"
              href={'/admin/old_zoom_conflictbot/' + adminKey}
              target="_blank"
              rel="noopener noreferrer"
            >
              Old Zoom Conflictbot
            </a>
            &nbsp;&nbsp;Open Old Zoom Conflictbot in new tab.
          </Stack>
        )}
        <Stack className="space-down-btn" direction="horizontal">
          <a
            className="btn btn-primary"
            href={'/admin/download_csv/filters/' + adminKey}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Queries
          </a>
          &nbsp;&nbsp;Download a CSV with current filters.
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
          <>
            <Stack className="space-down-btn" direction="horizontal">
              <Button variant="danger" onClick={() => handleWipeDBButton(true)}>
                Load Test Database
              </Button>
              &nbsp;&nbsp;This loads a clean test database.
            </Stack>
            <Stack className="space-down-btn" direction="horizontal">
              <Button
                variant="danger"
                onClick={() => handleWipeDBButton(false)}
              >
                Wipe Database Clean
              </Button>
              &nbsp;&nbsp;This removes ALL data from the database!
            </Stack>
          </>
        )}
      </Container>
    </Container>
  );
}
