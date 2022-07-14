import Container from 'react-bootstrap/Container';

export default function PaperConflict({header,conflicts}){

    return(
        <Container className="PaperConflict">
            <u>{header}</u>:
            { conflicts.length === 0 ? 
                <div> (none)</div>
                :
                <ul>
                {
                    conflicts.map((conflict, index) => {
                        return(
                            <li key={index}>{conflict.full_name}</li>
                        )
                    })
                }
                </ul>
            }
        </Container>
    )
}
