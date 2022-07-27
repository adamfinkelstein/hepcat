import Container from 'react-bootstrap/Container';

export default function PaperConflict({conflicts}){

    function userToClass(user) {
        let className = 'font-size-4'
        if (user.role_name === 'Admin') {
            className += ' admin-user'
        }
        return className
    }

    return(
        <Container className="PaperConflict">
            { conflicts.length === 0 ? 
                <div> (none)</div>
                :
                <ul>
                {
                    conflicts.map((conflict, index) => {
                        return(
                            <li key={index} className="conflict-element"><span className={userToClass(conflict)}>{conflict.full_name}</span></li>
                        )
                    })
                }
                </ul>
            }
        </Container>
    )
}
