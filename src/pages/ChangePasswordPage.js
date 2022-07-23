import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import {useState} from 'react'
import {useFlasher} from '../contexts/FlasherContext'
import {useAppGlobals} from '../contexts/AppContext'
import Alert from 'react-bootstrap/Alert';
import Collapse from 'react-bootstrap/Collapse';

export default function ChangePasswordPage(){
    let [password, setPassword] = useState("")
    let [passwordAgain, setPasswordAgain] = useState("")
    let flasher = useFlasher()
    let flash = flasher["flash"]
    let visible = flasher["visible"]
    let hideFlash = flasher["hideFlash"];
    let flashMessage = flasher["flashMessage"]

    let controlledLog = useAppGlobals()["controlledLog"]

    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;

    function handleSubmit(event){
        event.preventDefault();
        // Verify that the passwords match
        if (password !== passwordAgain) {
            flash("Passwords don't match.", "warning", "change_password")
            return;
        }
        var regularExpression = new RegExp('^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$');
        if (!regularExpression.test(password)) {
            flash("Passwords needs to contain 6-16 valid characters, contain a number and a special character.", "warning", "change_password")
            return;
          }
        controlledLog("changing password to " + password)
        flash("You have successfully changed your password", "success", "change_password")
        socketEmit("user_change_password", password)
    }

    function handleInputChange(event){
        event.preventDefault();
        const target = event.target;
        if(target.name === "password") setPassword(target.value)
        else if(target.name === "passwordAgain") setPasswordAgain(target.value)
    }

    return(
        <Container className="ChangePasswordPage">
            <Collapse in={visible["change_password"]}>
                <div>
                    <Alert variant={flashMessage.type || 'info'} dismissible
                    onClose={hideFlash}>
                        {flashMessage.message}
                    </Alert>
                </div>
            </Collapse>
            <Container className="change-password-main-container">
                <span className='font-size-1'>Change Password</span>
                <div className="password-fields">
                    <form onSubmit={handleSubmit}>
                        <div className="reset-password-row">
                            <label>Password:</label>
                            <input
                                name="password"
                                value={password}
                                onChange={handleInputChange}
                                style={{marginLeft: "15px"}}
                                />
                        </div>
                        <div className="reset-password-row"> 
                            <label>Re-enter Password:</label>
                            <input
                                name="passwordAgain"
                                value={passwordAgain}
                                onChange={handleInputChange}
                                style={{marginLeft: "15px"}}
                                />
                        </div> 
                        <Stack direction="horizontal">
                            <div>
                                <button type="submit" className="btn btn-primary reset-button">Reset Password</button>
                            </div>
                        </Stack>
                        
                    </form>
                </div>
            </Container>
        </Container>
    )
}