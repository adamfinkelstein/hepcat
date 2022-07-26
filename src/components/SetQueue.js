import { Container } from "react-bootstrap"
import {useState} from 'react'
import {useAppGlobals} from '../contexts/AppContext'
import {useGUI} from '../contexts/GUIContext'
import {useFlasher} from '../contexts/FlasherContext'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
// import {useRef} from 'react'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Stack from "react-bootstrap/Stack"
import Flasher from "./Flasher"

const scoreOptionAll = "All Scores"
const scoreOptionAbove = "At/Above Bar"
const scoreOptionBelow = "Below Bar"
const scoreOptionRange = "In Range"
const scoreOptions = [scoreOptionAll, scoreOptionAbove, scoreOptionBelow, scoreOptionRange]

export default function SetQueue(){
    const [disableScoreInputs, setDisableScoreInputs] = useState("")
    const globals = useAppGlobals()
    const probeCount = globals.probeCount
    const probeWhen = globals.probeWhen
    const probeMessage = probeWhen ? probeCount + " (" + probeWhen + ")" : "(not set)"
    const guiBarString = globals.guiBar+''
    const setGuiBar = globals.setGuiBar
    const socketEmit = globals.socketEmit
    let controlledLog = useAppGlobals()["controlledLog"]

    const filterList = ['Stickie Only','Unseen Only','No Clusters']
    const statusList = globals["statusList"]

    const {statusCheckbox, setStatusCheckbox, onlyCheckbox, setOnlyCheckbox, message, setMessage,
        hideQ, setHideQ, scoreSelection, setScoreSelection, lowRange, setLowRange, highRange, setHighRange,
        adminConflicts, setAdminConflicts, queueExplicitList, setQueueExplicitList} = useGUI()

    let flasher = useFlasher()
    let flash = flasher["flash"]

    /* This function handles the values of the range inputs
         scoreOptionAll, scoreOptionAbove, scoreOptionBelow, scoreOptionRange:
     All scores: lowRange=min, highRange=max
     Above bar: lowRange=bar, highRange=max
     Below bar: lowRange=min, highRange=bar
     In range: both are enabled for freeform input 
    */
    function handleScoreSelectionUpdate(selection) {
        const minScore = "-9.0"
        const maxScore = "9.0"
        const disable = (selection !== scoreOptionRange) ? "disabled" : "";
        // by default (scoreOptionRange) low and high range values remain
        let lowInput = lowRange 
        let highInput = highRange
        if (selection === scoreOptionAll) {
            lowInput = minScore
            highInput = maxScore
        } else if (selection === scoreOptionAbove) {
            lowInput = guiBarString
            highInput = maxScore
        } else if (selection === scoreOptionBelow) {
            lowInput = minScore
            highInput = guiBarString
        }
        setScoreSelection(selection)
        setDisableScoreInputs(disable)
        setLowRange(lowInput)
        setHighRange(highInput)
    }

    function getQueueFilterInfo() {
        const statuses = statusList.filter( (s,index) =>
            document.getElementById("status-checkbox-"+index).checked
        )
        const only = filterList.filter( (f,index) =>
            document.getElementById("only-checkbox-"+index).checked
        )
        const data = { statuses, only, lowRange, highRange, adminConflicts }
        return data
    }

    function handleGetFilteredCount(event) {
        event.preventDefault() // do not send the form!
        const data = getQueueFilterInfo()
        controlledLog('sending queue probe:')
        controlledLog(data)
        socketEmit("admin_probe_queue", data)
        // feels like too much here:
        // flash("Request sent for queue count.", "success", "set_queue")
    }

    function handleSetQueueButton(event) {
        event.preventDefault() // do not send the form!
        const data = getQueueFilterInfo()
        controlledLog('sending queue request:')
        controlledLog(data)
        socketEmit("admin_set_queue", data)
        flash("Sent queue request.", "success", "set_queue")
    }

    function handleSetQueueExplicitButton(event) {
        event.preventDefault(); // do not send the form! (Is this in form?!?)
        // get value from text field
        // save using: setQueueExplicitList(field)
        controlledLog('sending explicit queue request: '+queueExplicitList);
        const explicit = queueExplicitList.length ? queueExplicitList : '_CLEAR_'
        socketEmit("admin_set_queue_explicit", explicit)
        flash("Sent explicit queue request.", "success", "set_explicit");
    }

    function handleInputChange(event){
        event.preventDefault(); // do not send the form!
        const target = event.target;
        const value = target.value;
        if(target.name === "lowRange") setLowRange(value)
        else if(target.name === "highRange") setHighRange(value)
        else if(target.name === "message") setMessage(value)
        else if(target.name === "queueExplicit") setQueueExplicitList(value)
        else if(target.name === "bar") setGuiBar(value)
    }

    function handleHideQueueCheckbox(){
        const newHideQ = !hideQ
        setHideQ(newHideQ)
        controlledLog('hide queue after click: '+newHideQ)
        const data = { hide:newHideQ, message:message }
        socketEmit("admin_hide_queue", data)
    }

    function handleGatherAdminConflicts(){
        const newAdminConflicts = !adminConflicts
        setAdminConflicts(newAdminConflicts)
        controlledLog('admin conflicts after click: '+newAdminConflicts)
    }

    function handleSetBarButton(){
        controlledLog('bar set:', guiBarString)
        socketEmit("admin_set_bar", guiBarString)
        // flash("Bar set to " + guiBarString + ".", "success", "change_bar")
    }

    return(
        <Container>
            <Flasher type="hide_queue"/>
            <div>
                <Stack direction="horizontal">
                    <Form.Check type="checkbox" defaultChecked={hideQ}
                        onChange={handleHideQueueCheckbox}
                    />
                    <span className="hideQ-text font-size-4">Hide queue from everyone except admin.</span>
                </Stack>
                <Stack direction="horizontal" className="set-message-row">
                    <span className="font-size-4">Message: </span>
                    <input
                        name="message"
                        value={message}
                        onChange={handleInputChange}
                        className="message-input"
                    />
                </Stack>

            </div>
            <hr className="horizontal-divider"/>
            <Flasher type="set_queue"/>
            <div>
                <Stack direction="horizontal" gap={4}>
                    <div>&nbsp;</div>
                    <div>
                        <span className="font-size-3"><u>Include All</u>:</span>
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
                                        controlledLog("includes")
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
                        <span className="font-size-3"><u>Include Only</u>:</span>
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
                    <div className="vr" />
                <div>
                    <Stack direction="vertical" gap={4}>
                        <DropdownButton id="dropdown-item-button" 
                            title={scoreSelection} className="new-status-dropdown"
                            variant="secondary" type="button">
                            {
                                scoreOptions.map((selection, index) => {
                                    return(
                                        <Dropdown.Item key={index} as="button" onClick={() => handleScoreSelectionUpdate(selection)}>{selection}</Dropdown.Item>
                                    )
                                })
                            }
                        </DropdownButton>
                        <div>
                            <input
                                name="lowRange"
                                value={lowRange}
                                onChange={handleInputChange}
                                disabled={disableScoreInputs}
                                className="score-box"
                            />
                            <span>&nbsp;&le;&nbsp;score&nbsp;&lt;&nbsp;</span>
                            <input
                                name="highRange"
                                value={highRange}
                                onChange={handleInputChange}
                                disabled={disableScoreInputs}
                                className="score-box"
                            />
                        </div>
                    </Stack>
                </div>
                </Stack>
                <div>
                    <Stack direction = "horizontal" className="get-filtered-count">
                        <Button variant="primary" onClick={handleGetFilteredCount}>Get Filtered Count
                        </Button>
                        <span className="font-size-3 get-filtered-count-text">Count:&nbsp;{probeMessage}</span>
                    </Stack>
                    <Stack direction = "horizontal" className="set-filtered-queue-stack">
                        <Button variant="primary" className="set-filtered-queue-button"
                            onClick={handleSetQueueButton}>Set Filtered Queue
                        </Button>
                        <Form.Check type="checkbox" defaultChecked={adminConflicts}
                            onChange={handleGatherAdminConflicts}
                        />
                        <span className="gather-admin-text font-size-3">&nbsp;Gather Admin conflicts at start.</span>
                    </Stack>
                </div>
            </div>
            <hr className="horizontal-divider"/>
            <Flasher type="set_explicit"/>
            <div>
                <Stack direction = "horizontal">
                    <div>
                    <input
                        name="queueExplicit"
                        value={queueExplicitList}
                        className="queue-explicit-input"
                        onChange={handleInputChange}
                    /><br/>
                    <Button onClick={handleSetQueueExplicitButton} className="queue-explicit-btn">Set Explicit Queue</Button>
                    </div>
                    <ul className="queue-explicit-instructions">
                    <li className="font-size-4">Empty string ('') to clear queue.</li>
                    <li className="font-size-4">Cluster name like 'Cluster-A'.</li>
                    <li className="font-size-4">Area name like 'Area-Rendering'.</li>
                    <li className="font-size-4">Paper number(s) like '101' or '101,103,105,107'.</li>
                    </ul>
                </Stack>
            </div>
            <hr className="horizontal-divider"/>
            <Flasher type="change_bar"/>
            <div>
                <Stack direction = "horizontal">
                    <Button variant="primary" onClick={handleSetBarButton} 
                        className="change-bar-btn">Change Bar</Button>
                    <input
                        name="bar"
                        value={guiBarString}
                        onChange={handleInputChange}
                    />
                </Stack>
            </div>
        </Container>
    )
}