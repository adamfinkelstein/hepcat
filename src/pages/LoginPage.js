import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import {useState} from 'react'
import {useAppGlobals} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'


export default function LoginPage() {
    let [email, setEmail] = useState("")
    let [password, setPassword] = useState("")
    let flasher = useFlasher()
    let flash = flasher["flash"]
    
    const globals = useAppGlobals();
    const socketEmit = globals.socketEmit;
    const controlledLog = globals.controlledLog

    function handleSubmit(){
        let missing = ''
        if (!email) missing = 'email'
        if (!password) missing = 'password'
        if (!email && !password) missing = 'email and password'
        if (missing) {
            flash("Please enter your " + missing + ".", "warning", "login")
            return;
        }
        const data = {email, password}
        controlledLog("sending login:")
        controlledLog(data)
        socketEmit("user_auth_login", data)
        setEmail('')
        setPassword('')
    }

    function handleInputChange(event){
        event.preventDefault();
        const target = event.target;
        const name = target.name;
        const trim = target.value.trim();
        if(name === "email") setEmail(trim);
        else if(name === "password") setPassword(trim);
    }

    function handleKeyDown(event){
        if (event.key === 'Enter') {
            handleSubmit();
        }
    }

    return(
        <Container className="LoginPage">
            <Flasher type="login"/>
            <Container className="change-password-main-container">

                <span className='font-size-1'>Hepcat Login</span>

                <div className="password-fields">

                     <div className="reset-password-row">
                        <label>Email:</label>
                        <input
                            name="email"
                            value={email}
                            type="text"
                            onChange={handleInputChange}
                            style={{marginLeft: "15px"}}
                            />
                    </div>
                    <div className="reset-password-row">
                        <label>Password:</label>
                        <input
                            name="password"
                            value={password}
                            type="password"
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            style={{marginLeft: "15px"}}
                            />
                    </div>
                    
                    <Stack direction="horizontal">
                        <div>
                            <button type="submit" className="btn btn-primary reset-password-button" onClick={() => handleSubmit()}>Login</button>
                        </div>
                    </Stack>
                </div>

            </Container>
        </Container>
    )
}