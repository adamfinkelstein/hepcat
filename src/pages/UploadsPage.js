import moment from 'moment'
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
//import {useState, useRef} from 'react'
import {useAppGlobals} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button'
//import Button from 'react-bootstrap/Button';

export default function UploadsPage() {
    let flasher = useFlasher()
    let flash = flasher["flash"]
    
    const globals = useAppGlobals();
    const user = globals.user
    const isAdmin = globals.isAdmin
    const isSuper = user && user.role_name === "Super"
    const socketEmit = globals.socketEmit;
    const controlledLog = globals.controlledLog
    const fileUploads = globals.fileUploads
    const uploadList = fileUploads ? fileUploads.uploads : []
    const pendingList = fileUploads ? fileUploads.pending : []
    const uploadTitle = uploadList.length ? 'Uploaded Files:' : 'No files uploaded yet.'
    const pendingTitle = pendingList.length ? 'Pending Files:' : 'No files pending.'

    function handleSubmit(event){
        event.preventDefault()
        const fileUp = document.getElementById('form-file-upload');
        if (!fileUp.value) return;
        const file = fileUp.files[0]
        const fileName = file.name
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext !== 'csv') {
            const msg = "The file '" + fileName + "' does not appear to be a CSV file."
            flash(msg, "warning", "uploads")
            fileUp.value = null // reset the upload 
            return
        }
        controlledLog("sending file:")
        controlledLog(file)
        socketEmit("admin_file_upload", file)
        fileUp.value = null // reset the upload 
    }

    function formatUpload(upload) {
        const when = moment.utc(upload.when).local().format('llll')
        const fmt = upload.file + ' (' + upload.count + ' uploaded ' + when + ')'
        return fmt
    }

    function handleWipeDBButton(){
        controlledLog('Wipe DB button pressed.');
        let text = "Are you really, Really, REALLY sure you want to wipe out the database?";
        if (window.confirm(text) === true) {
            controlledLog('Wipe DB button confirmed. Redirect.');
            window.location.href = '/admin/wipe_database'
        } else {
            controlledLog('Wipe DB button canceled.');
        }
    }

    return(
        <Container className="titled-page">
            <span className='font-size-1'>Upload CSV Files Here</span>
            <Flasher type="uploads"/>
            <Container className="change-password-main-container">

                <Form>
                <Form.Group controlId="form-file-upload" className="mb-3">
                <Form.Label>Choose a CSV file:</Form.Label>
                <Form.Control type="file" />
                </Form.Group>
                </Form>

                <Stack direction="horizontal">
                        <div>
                            <button type="submit" className="btn btn-primary reset-password-button" onClick={(e) => handleSubmit(e)}>Send</button>
                        </div>
                </Stack>
                <p>&nbsp;</p>
                <span className='font-size-2'>{pendingTitle}</span>
                <ul>
                {        
                    pendingList.map(item => {
                        return (
                            <li key={item} className="file-list-item">{item}
                            </li>
                        )
                    })
                }
                </ul>
                <span className='font-size-2'>{uploadTitle}</span>
                <ul>
                {        
                    uploadList.map(item => {
                        return (
                            <li key={item.file} className="file-list-item">{formatUpload(item)}
                            </li>
                        )
                    })
                }
                </ul>

                { isAdmin && (
                    <div>
                    <p>&nbsp;</p>
                    <hr/>
                    <p>&nbsp;</p>
                    <span className='font-size-2'>Extra Admin Functions</span>
                    <p>&nbsp;</p>

                    <Stack direction="horizontal">
                    <a className="btn btn-warning" href="/admin/download_results_csv" target="_blank">Download Results</a>
                        &nbsp;&nbsp;Download a CSV with the final status of all papers.
                    </Stack>
                    </div>
                )}

                <p>&nbsp;</p>
                { isSuper && (
                    <Stack direction="horizontal">
                    <Button variant="danger" onClick={handleWipeDBButton} 
                        className="bulk-reject-btn">Wipe Database Clean</Button>
                        &nbsp;&nbsp;This removes ALL data from the database!
                    </Stack>
                )}

            </Container>
        </Container>
    )
}