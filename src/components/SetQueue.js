import { Container } from "react-bootstrap";
import {useQueue} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import {useState} from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Stack from "react-bootstrap/Stack";

export default function SetQueue(){
    let queue = useQueue()
    let flasher = useFlasher()
    let flash = flasher["flash"]
    let [scoreSelection, setScoreSelection] = useState("At/Above Bar")
    let [lowRange, setLowRange] = useState(0)
    let [highRange, setHighRange] = useState(5.1)
    let [adminConflicts, setAdminConflicts] = useState("Never")

    function setQueue(){
        flash("Queue successfully set with " + queue.length + " papers.", "success")
    }

    function handleInputChange(event){
        event.preventDefault();
        const target = event.target;
        if(target.name === "lowRange") setLowRange(target.value)
        else if(target.name === "highRange") setHighRange(target.value)
    }

    return(

        
        <Container>
            <div>
                
                <Form>

                    
                    <div key={`inline-checkbox`} className="mb-4">
                        <span style={{fontSize:"18px"}}>Filter for: </span>
                        <Form.Check
                            inline
                            label="Reject"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-1`}
                        />
                        <Form.Check
                            inline
                            label="Conference"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-2`}
                        />
                        <Form.Check
                            inline       
                            label="Journal"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-3`}
                        />
                        <Form.Check
                            inline       
                            label="Table"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-3`}
                        />
                    </div>

                    <div style={{marginBottom: "20px"}}>
                        <Stack direction="horizontal" gap={4}>
                            <DropdownButton id="dropdown-item-button" title={scoreSelection} className="new-status-dropdown">
                                {
                                    ["All Scores", "At/Above Bar", "Below Bar", "In Range"].map((scoreSelection, index) => {
                                        return <Dropdown.Item key={index} as="button" onClick={() => setScoreSelection(scoreSelection)}>{scoreSelection}</Dropdown.Item>
                                    })
                                }
                            </DropdownButton>
                            <input
                                name="lowRange"
                                value={lowRange}
                                onChange={handleInputChange}
                            />
                            <span style={{fontSize: "18px"}}>&le; Avg &le;</span>
                            <input
                                name="highRange"
                                value={highRange}
                                onChange={handleInputChange}
                            />

                        </Stack>
                    </div>

                    <div key={`inline-checkbox`} className="mb-4">
                        <Form.Check
                            inline
                            label="Sticky Only"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-1`}
                        />
                        <Form.Check
                            inline
                            label="Untouched Only"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-2`}
                        />
                        <Form.Check
                            inline       
                            label="No Clusters"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-3`}
                        />
                        <Form.Check
                            inline       
                            label="Table"
                            name="group1"
                            type="checkbox"
                            id={`inline-checkbox-3`}
                        />
                    </div>

                    <div>
                        <Stack direction = "horizontal">
                            <span style={{fontSize:"18px"}}>Gather admin/chair conflicts: </span>
                            <DropdownButton id="dropdown-item-button" title={adminConflicts} className="new-status-dropdown">
                                {
                                    ["Start", "End", "Never"].map((conflictSelection, index) => {
                                        return <Dropdown.Item key={index} as="button" onClick={() => setAdminConflicts(conflictSelection)}>{conflictSelection}</Dropdown.Item>
                                    })
                                }
                            </DropdownButton>
                        </Stack>
                    </div>

                </Form>
            </div>
            <Button variant="primary" onClick={()=>setQueue()} style={{marginTop: "30px"}}>Update Queue</Button>
        </Container>
    )
}