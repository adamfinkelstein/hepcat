import Container from 'react-bootstrap/Container'
import Grid from './Grid.js'
import {useState} from 'react'
import ColorsDisplay from './ColorsDisplay';
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'

export default function GridSection(){
    const [gridDisplay, setGridDisplay] = useState("Normal");

    return(
        <Container>
            <DropdownButton id="dropdown-item-button" 
                            title={gridDisplay}
                            variant="secondary" className='grid-display-dropdown'>
                {
                    ["Normal", "Stickie", "Favorites"].map((gridDisplay, index) => {
                        return(
                            <Dropdown.Item key={index} as="button" onClick={() => setGridDisplay(gridDisplay)}>{gridDisplay}</Dropdown.Item>
                        )
                    })
                }
            </DropdownButton>
            <div className="grid-container">
                <Grid isAbove gridDisplay={gridDisplay}/>
            </div> 
            <hr className="divider"/>
            <div className="grid-container">
                <Grid gridDisplay={gridDisplay}/>
            </div>
            <ColorsDisplay/>
        </Container>
    )
}