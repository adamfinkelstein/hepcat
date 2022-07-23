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
                            <li key={index}><span className="font-size-3">{conflict.full_name}</span></li>
                        )
                    })
                }
                </ul>
            }
        </Container>
    )
}
