import { Container } from "react-bootstrap";
import {useQueue, useSocketEmit} from '../contexts/AppContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import {useState} from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Stack from "react-bootstrap/Stack";

const statusList = ['Tabled','Reject','Conference','Journal'];
const filterList = ['Stickie Only','Untouched Only','No Clusters'];

export default function SetQueue(){
    let socketEmit = useSocketEmit()
    let queue = useQueue()
    let flasher = useFlasher()
    let flash = flasher["flash"]
    let [scoreSelection, setScoreSelection] = useState("At/Above Bar")
    let [lowRange, setLowRange] = useState(0)
    let [highRange, setHighRange] = useState(5.1)
    let [adminConflicts, setAdminConflicts] = useState("Never")

    function setQueue(){
        const statuses = statusList.filter( (s,index) =>
            document.getElementById("status-checkbox-"+index).checked
        );
        const filters = filterList.filter( (f,index) =>
            document.getElementById("only-checkbox-"+index).checked
        );
        const data = { statuses, filters, lowRange, highRange, adminConflicts };
        console.log(data);
        socketEmit("admin_set_queue", data)
        flash("Sent queue request.", "success");
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
                    <Stack direction="horizontal" gap={5}>
                        <div>&nbsp;</div>
                        <div>
                            <span style={{fontSize:"18px"}}><u>Include All</u>:</span>
                            <br />
                            <div key={`status-checkbox`} className="mb-4">
                            { statusList.map((label, index) => {
                                return(
                                    <div key={`status-checkbox-div-`+index}>
                                    <Form.Check
                                    label={label}
                                    type="checkbox"
                                    id={`status-checkbox-`+index}
                                    />
                                    </div>
                                )
                            })}
                            </div>
                        </div>
                        <div className="vr" />
                        <div>
                            <span style={{fontSize:"18px"}}><u>Include Only</u>:</span>
                            <br />
                            <div key={`only-checkbox`} className="mb-4">
                            { filterList.map((label, index) => {
                                return(
                                    <div key={`only-checkbox-div-`+index}>
                                    <Form.Check
                                    label={label}
                                    type="checkbox"
                                    id={`only-checkbox-`+index}
                                    />
                                    </div>
                                )
                            })}
                            </div>
                            <div>&nbsp;</div>
                        </div>
                    </Stack>
                    <div style={{marginBottom: "20px"}}>
                        <Stack direction="horizontal" gap={4}>
                            <DropdownButton id="dropdown-item-button" 
                                title={scoreSelection} className="new-status-dropdown"
                                variant="secondary">
                                {
                                    ["All Scores", "At/Above Bar", "Below Bar", "In Range"].map((scoreSelection, index) => {
                                        return <Dropdown.Item key={index} as="button" onClick={() => setScoreSelection(`scoreSelection`)}>{scoreSelection}</Dropdown.Item>
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
                    <div>
                        <Stack direction = "horizontal">
                            <span style={{fontSize:"18px"}}>Gather admin/chair conflicts: </span>
                            <DropdownButton id="dropdown-item-button" 
                                title={adminConflicts} className="new-status-dropdown"
                                variant="secondary">
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