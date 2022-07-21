import { Container } from "react-bootstrap";
import {useAppGlobals} from '../contexts/AppContext'
import {useGUI} from '../contexts/GUIContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import {useRef} from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Stack from "react-bootstrap/Stack";

const statusList = ['Tabled','Reject','Conference','Journal'];
const filterList = ['Stickie Only','Unseen Only','No Clusters'];

export default function SetQueue(){
    const globals = useAppGlobals()
    const socketEmit = globals.socketEmit;
    // let queue = globals.queue;
    let flasher = useFlasher()
    let flash = flasher["flash"]
    const barRef = useRef(null);
    // const explicitRef = useRef(null);

    const {statusCheckbox, setStatusCheckbox, onlyCheckbox, setOnlyCheckbox, message, setMessage,
        hideQ, setHideQ, scoreSelection, setScoreSelection, lowRange, setLowRange, highRange, setHighRange,
        adminConflicts, setAdminConflicts, queueExplicitList, setQueueExplicitList, bar, setBar} = useGUI()


    function handleSetQueueButton(event) {
        event.preventDefault(); // do not send the form!
        const statuses = statusList.filter( (s,index) =>
            document.getElementById("status-checkbox-"+index).checked
        );
        const only = filterList.filter( (f,index) =>
            document.getElementById("only-checkbox-"+index).checked
        );
        const data = { statuses, only, lowRange, highRange, adminConflicts };
        console.log('sending queue request:');
        console.log(data);
        socketEmit("admin_set_queue", data)
        flash("Sent queue request.", "success");
    }

    function handleSetQueueExplicitButton(event) {
        event.preventDefault(); // do not send the form! (Is this in form?!?)
        // get value from text field
        // save using: setQueueExplicitList(field)
        console.log('sending explicit queue request: '+queueExplicitList);
        const explicit = queueExplicitList.length ? queueExplicitList : '_CLEAR_'
        socketEmit("admin_set_queue_explicit", explicit)
        flash("Sent explicit queue request.", "success");
    }

    function handleInputChange(event){
        event.preventDefault(); // do not send the form!
        const target = event.target;
        const value = target.value;
        if(target.name === "lowRange") setLowRange(value)
        else if(target.name === "highRange") setHighRange(value)
        else if(target.name === "message") setMessage(value)
        else if(target.name === "queueExplicit") setQueueExplicitList(value)
    }

    return(
        <Container>
            <div>
                <Stack direction="horizontal">
                    <Form.Check
                        type="checkbox"
                        defaultChecked={hideQ}
                        onChange={() => {
                            setHideQ(!hideQ)
                        }}
                    />
                    <span className="hideQ-text">Hide queue from everyone except admin</span>
                </Stack>
                <Stack direction="horizontal" className="set-message-row">
                    <span>Message: </span>
                    <input
                        name="message"
                        value={message}
                        onChange={handleInputChange}
                        className="message-input"
                    />
                </Stack>

            </div>
            <hr className="horizontal-divider"/>
            <div>
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
                                checked = {statusCheckbox.includes(label)}
                                onChange={() => {
                                    if(statusCheckbox.includes(label)){
                                        console.log("includes")
                                        setStatusCheckbox((oldStatusCheckbox) => {
                                            return oldStatusCheckbox.filter((oldStatus, i) => oldStatus !== label)
                                        })
                                    }else{
                                        setStatusCheckbox((oldStatusCheckbox) => {
                                            return [...oldStatusCheckbox, label]
                                        })
                                    }
                                }}
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
                                checked = {onlyCheckbox.includes(label)}
                                onChange={() => {
                                    if(onlyCheckbox.includes(label)){
                                        setOnlyCheckbox((oldOnlyCheckbox) => {
                                            return oldOnlyCheckbox.filter((oldOnly, i) => oldOnly !== label)
                                        })
                                    }else{
                                        setOnlyCheckbox((oldOnlyCheckbox) => {
                                            return [...oldOnlyCheckbox, label]
                                        })
                                    }
                                }}
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
                            variant="secondary" type="button">
                            {
                                ["All Scores", "At/Above Bar", "Below Bar", "In Range"].map((scoreSelection, index) => {
                                    return(
                                        <Dropdown.Item key={index} as="button" onClick={() => setScoreSelection(scoreSelection)}>{scoreSelection}</Dropdown.Item>
                                    )
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
                            variant="secondary" type="button">
                            {
                                ["Start", "End", "Never"].map((conflictSelection, index) => {
                                    return <Dropdown.Item key={index} as="button" onClick={() => setAdminConflicts(conflictSelection)}>{conflictSelection}</Dropdown.Item>
                                })
                            }
                        </DropdownButton>
                    </Stack>
                </div>
            </div>
            <Button variant="primary" onClick={handleSetQueueButton} style={{marginTop: "30px"}}>Set Filtered Queue</Button>
            <hr className="horizontal-divider"/>
            <div>
                <Stack direction = "horizontal">
                    <div>
                    <input
                        name="queueExplicit"
                        value={queueExplicitList}
                        className="queue-explicit-input"
                        onChange={handleInputChange}
                    />
                    <Button onClick={handleSetQueueExplicitButton} className="queue-explicit-btn">Set Explicit Queue</Button>
                    </div>
                    <ul>
                    <li>Empty string ('') to clear queue.</li>
                    <li>Cluster name like 'Cluster-A'.</li>
                    <li>Area name like 'Area-Rendering'.</li>
                    <li>Paper number(s) like '101' or '101,103,105,107'.</li>
                    </ul>
                </Stack>
            </div>
            <hr className="horizontal-divider"/>
            <div>
                <Stack direction = "horizontal">
                    <Button variant="primary" onClick={() => setBar(barRef)} className="change-bar-btn">Change Bar</Button>
                    <input
                        ref={barRef}
                        name="bar"
                        defaultValue={bar}
                    />
                </Stack>
            </div>
        </Container>
    )
}