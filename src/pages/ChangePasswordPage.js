import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import {useState} from 'react'
import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'
import {useAppGlobals} from '../contexts/AppContext'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Form from 'react-bootstrap/Form'

export default function ChangePasswordPage(){
    let [password, setPassword] = useState("")
    let [passwordAgain, setPasswordAgain] = useState("")
    let flasher = useFlasher()
    let flash = flasher["flash"]
    
    let [forWho, setForWho] = useState("Select a user")
    let [forEmail, setForEmail] = useState("")
    let [isForOther, setIsForOther] = useState(false)

    let controlledLog = useAppGlobals()["controlledLog"]

    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;
    const isAdmin = globals.isAdmin
    const allUsers = globals.allUsers

    function handleSubmit(){
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

        if(isForOther && forWho == "Select a user"){
            flash("Please pick a user.", "warning", "change_password")
            return;
        }

        controlledLog("changing password to " + password)
        // now flash comes from server instead of here:
        // flash("You have successfully changed your password", "success", "change_password")
        socketEmit("user_change_password", password)
        setPassword('')
        setPasswordAgain('')
    }

    function handleSetFor(user) {
        setForWho(user.full_name)
        setForEmail(user.email)
    }

    function handleInputChange(event){
        event.preventDefault();
        const target = event.target;
        if(target.name === "password") setPassword(target.value)
        else if(target.name === "passwordAgain") setPasswordAgain(target.value)
    }

    return(
        <Container className="ChangePasswordPage">
            <Flasher type="change_password"/>
            <Container className="change-password-main-container">
                <span className='font-size-1'>Change Password</span>
                <div className="password-fields">

                    { isAdmin && (
                        <Stack direction="horizontal" className="password-switch">
                            <Form.Check type="switch" defaultChecked={isForOther}
                                        onChange={() => setIsForOther(!isForOther)}/>
                            <span className="font-size-4">Change for someone else</span>
                        </Stack>)}
                    { isAdmin && isForOther && (
                        <DropdownButton title={forWho} type="button"
                                        variant="secondary" className='grid-display-dropdown'>
                            {
                                allUsers.map((user, index) => {
                                    return(
                                        <Dropdown.Item key={index} as="button" onClick={
                                            () => handleSetFor(user)}
                                            >{user.full_name}</Dropdown.Item>
                                    )
                                })
                            }
                        </DropdownButton>)
                    }


                    <div className="reset-password-row">
                        <label>Password:</label>
                        <input
                            name="password"
                            value={password}
                            type="password"
                            onChange={handleInputChange}
                            style={{marginLeft: "15px"}}
                            />
                    </div>
                    <div className="reset-password-row"> 
                        <label>Re-enter Password:</label>
                        <input
                            name="passwordAgain"
                            value={passwordAgain}
                            type="password"
                            onChange={handleInputChange}
                            style={{marginLeft: "15px"}}
                            />
                    </div> 
                    
                    <Stack direction="horizontal">
                        <div>
                            <button type="submit" className="btn btn-primary reset-password-button" onClick={() => handleSubmit()}>Reset Password</button>
                        </div>
                    </Stack>
                </div>
            </Container>
        </Container>
    )
}