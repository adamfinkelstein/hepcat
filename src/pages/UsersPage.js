import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
// import {useState} from 'react'
// import {useFlasher} from '../contexts/FlasherContext'
import Flasher from '../components/Flasher'
import {useAppGlobals} from '../contexts/AppContext'

export default function UsersPage(){
    // let [lastPing, setLastPing] = useState(null)
    // let flasher = useFlasher()
    // let flash = flasher["flash"]
    
    const globals = useAppGlobals();
    // const socketEmit = globals.socketEmit;
    const isAdmin = globals.isAdmin
    const allUsers = isAdmin ? globals.allUsers : []

    const userLine = (user) => {
        let line = user.full_name + ' <' + user.email + '> ' + user.room_name 
        if (user.rooms) {
            line += ' [' + user.rooms + ']'
        }
        return line
    }

    const userClasses = (user) => {
        return user.role_is_admin ? 'admin-user' : ''
    }

    return(
        <Container className="UsersPage">
            <Flasher type="users"/>
            <Container className="users-main-container">
                <p>&nbsp;</p>
                <span className='font-size-1'>All Users</span>
                <Stack direction="vertical">
                {
                    allUsers.map((user, index) => {
                        return(
                            <div key={index} 
                            className={userClasses(user)}
                            >{userLine(user)}</div>
                        )
                    })
                }
                <p>&nbsp;</p>
                </Stack>
            </Container>
        </Container>
    )
}