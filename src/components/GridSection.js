import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import Grid from './Grid.js'
import {useState} from 'react'
import ColorsDisplay from './ColorsDisplay';
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Button from 'react-bootstrap/Button'

export default function GridSection(){
    const [gridDisplay, setGridDisplay] = useState("Normal");

    const [stickie, setStickie] = useState("Tabled, Needs Discussion")
    const [ID, setID] = useState(null)
    const stickieList = ["Tabled, Needs Discussion", "Converged to Journal", "Converged to Conference", "Converged to Reject"]

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
            <hr className="horizontal-divider"/>
            <div className="grid-container">
                <Grid gridDisplay={gridDisplay}/>
            </div>
            <Stack direction="horizontal">
                <ColorsDisplay/>
                <hr className="vertical-divider"></hr>
                <Container className="set-stickie">
                    <span>Set Stickie Messages Here: </span>
                    <Stack direction = "horizontal">
                        <DropdownButton title={stickie}
                                        variant="outline">
                            {
                                stickieList.map((newStickie, index) => {
                                    return(
                                        <Dropdown.Item as="button" key={index}
                                            onClick={() => setStickie(newStickie)}>
                                            <span>{newStickie}</span>
                                        </Dropdown.Item>
                                    )
                                })
                                
                            }
                        </DropdownButton>
                        <span>ID: </span>
                        <input
                            name="id"
                            onChange={(event) => {
                                setID(event.target.value)
                            }}
                        />
                        <Button variant="primary" onClick={()=>{
                            if(!ID){
                                console.log("Please choose a paper id.")
                            }else{
                                console.log("Send stickie " + stickie + " to paper with id: " + ID)
                            }
                        }}>Send</Button>
                    </Stack>
                </Container>
            </Stack>
        </Container>
    )
}