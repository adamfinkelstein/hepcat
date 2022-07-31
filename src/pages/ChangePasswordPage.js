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
    
    const defaultForWho = "Select a user"
    let [forWho, setForWho] = useState(defaultForWho)
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

        if (!isForOther || !isAdmin) {
            var regularExpression = new RegExp('^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$');
            if (!regularExpression.test(password)) {
                flash("Passwords needs to contain 6-16 valid characters, contain a number and a special character.", "warning", "change_password")
                return;
            }
        }

        if(isForOther && forEmail === ""){
            flash("Please pick a user.", "warning", "change_password")
            return;
        }

        const data = {password, forEmail}

        controlledLog("changing password data:")
        controlledLog(data)
        socketEmit("user_change_password", data)
        setPassword('')
        setPasswordAgain('')
        setForEmail('')
        setForWho(defaultForWho)
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
                        <Stack direction="horizontal" className="password-switch-stack">
                            <Form.Check type="switch" defaultChecked={isForOther} className="password-switch"
                                        onChange={() => setIsForOther(!isForOther)}/>
                            <span className="font-size-4">Change for someone else</span>
                        { isForOther && (
                            <><span>&nbsp;&mdash;&nbsp;</span>
                            <DropdownButton title={forWho} type="button"
                                            variant="secondary" className='select-user-dropdown'>
                                { // was: filter(user => (user.role_name !== 'Admin'))
                                    allUsers.map((user, index) => {
                                        return(
                                            <Dropdown.Item key={index} as="button" onClick={
                                                () => handleSetFor(user)}
                                                >{user.full_name}</Dropdown.Item>
                                        )
                                    })
                                }
                            </DropdownButton></>)
                        }
                        </Stack>)}


                    <div className="reset-password-row">
                        <label>Enter Password:</label>
                        <input
                            name="password"
                            value={password}
                            type="password"
                            onChange={handleInputChange}
                            style={{marginLeft: "15px"}}
                            />
                    </div>
                    <div className="reset-password-row"> 
                        <label>Repeat Password:</label>
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