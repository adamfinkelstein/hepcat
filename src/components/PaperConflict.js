import Container from 'react-bootstrap/Container';

export default function PaperConflict({conflicts}){

    return(
        <Container className="PaperConflict">
            { conflicts.length === 0 ? 
                <div> (none)</div>
                :
                <ul>
                {
                    conflicts.map((conflict, index) => {
                        return(
                            <li key={index} className="conflict-element"><span className="font-size-4">{conflict.full_name}</span></li>
                        )
                    })
                }
                </ul>
            }
        </Container>
    )
}
