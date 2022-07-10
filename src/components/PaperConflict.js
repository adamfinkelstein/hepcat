import Container from 'react-bootstrap/Container';

export default function PaperConflict({conflicts}){

    
    return(
        <Container className="PaperConflict">
            Conflicted:
            <ul>
            {
                conflicts.map((conflict, index) => {
                    return(
                        <li key={index}>{conflict.full_name}</li>
                    )
                })
            }
            </ul>
        </Container>
    )
}
