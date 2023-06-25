import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
//import {useState, useRef} from 'react'
import {useAppGlobals} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'
import Form from 'react-bootstrap/Form';
//import Button from 'react-bootstrap/Button';

export default function UploadsPage() {
    let flasher = useFlasher()
    let flash = flasher["flash"]
    
    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;
    const controlledLog = globals.controlledLog

    // <Form.File.Label>Upload CSV Files</Form.File.Label>


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
            </Container>
        </Container>
    )
}