import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { DateTime } from 'luxon';
import { useAdmin } from '../contexts/AdminContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { usePreferences } from '../contexts/PreferencesContext';
import DangerousOps from '../components/DangerousOps';

export default function UploadsPage() {
  const { flash } = useFlasher();
  const { revealModalDialog } = useModalDialog();
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { fontPref } = usePreferences();
  const { fileUploads } = useAdmin();
  const uploadList = fileUploads ? fileUploads.uploads : [];
  const pendingList = fileUploads ? fileUploads.pending : [];
  const uploadTitle = uploadList.length
    ? 'Uploaded Files:'
    : 'No files uploaded yet.';
  const pendingTitle = pendingList.length
    ? 'Pending Files:'
    : 'No files pending.';

  const handleSendBtn = (event) => {
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
      revealModalDialog({ title: 'Upload Error', message: msg });
      fileUp.value = null; // reset the upload
      return;
    }
    controlledLog('sending file:');
    controlledLog(file);
    socketEmit('admin_file_upload', file);
    fileUp.value = null; // reset the upload
    const msg = "Sent file '" + fileName + "' for upload.";
    flash(msg, 'success');
  };

  const formatUpload = (upload) => {
    const fmt = 'ccc MMM d, h:mm a ZZZZ';
    const when = DateTime.fromISO(upload.when).toLocal().toFormat(fmt);
    const msg = upload.file + ' (' + upload.count + ' uploaded ' + when + ')';
    return msg;
  };

  const handleRequestDownloadBtn = (kind) => {
    socketEmit('admin_request_download', kind);
    const msg = "Request file '" + kind + "' for download.";
    flash(msg, 'success');
  };

  return (
    <Container className="UploadsPage mt-3">
      <div className={fontPref}>
        <h1>Upload CSV Files Here</h1>
        <Container fluid>
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
                className="btn btn-primary"
                onClick={(e) => handleSendBtn(e)}
              >
                Send File
              </button>
            </div>
          </Stack>
          <p>&nbsp;</p>
          <h3>{pendingTitle}</h3>
          <ul>
            {pendingList.map((item) => {
              return (
                <li key={item} className="file-list-item">
                  {item}
                </li>
              );
            })}
          </ul>
          <h3>{uploadTitle}</h3>
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
            <hr />
            <h2>Extra Admin Functions</h2>
          </div>
          <Stack className="mt-4 mb-5" direction="vertical" gap={4}>
            <Stack direction="horizontal">
              <Button
                className="btn-warning"
                onClick={() => handleRequestDownloadBtn('filters')}
              >
                Download Filters
              </Button>
              &nbsp;&nbsp;Download a CSV containing all current filters.
            </Stack>
            <Stack direction="horizontal">
              <Button
                className="btn-warning"
                onClick={() => handleRequestDownloadBtn('results')}
              >
                Download Results
              </Button>
              &nbsp;&nbsp;Download a CSV with the final status of all papers.
            </Stack>
            <Stack direction="horizontal">
              <Button
                className="btn-warning"
                onClick={() => handleRequestDownloadBtn('zip')}
              >
                Download ZIP
              </Button>
              &nbsp;&nbsp;Download a ZIP containing CSVs describing database.
            </Stack>
            <DangerousOps />
          </Stack>
        </Container>
      </div>
    </Container>
  );
}
