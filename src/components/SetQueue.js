import moment from 'moment';
import { Container } from 'react-bootstrap';
import { useState } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useGUI } from '../contexts/GUIContext';
import { useFlasher } from '../contexts/FlasherContext';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Stack from 'react-bootstrap/Stack';

const scoreOptionAll = 'All Scores';
const scoreOptionAbove = 'At/Above Bar';
const scoreOptionBelow = 'Below Bar';
const scoreOptionRange = 'In Range';
const scoreOptions = [
  scoreOptionAll,
  scoreOptionAbove,
  scoreOptionBelow,
  scoreOptionRange,
];

export default function SetQueue() {
  const [disableScoreInputs, setDisableScoreInputs] = useState('');
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const globals = useAppGlobals();
  const hideQ = globals.hideQ;
  const setHideQ = globals.setHideQ;
  const hiddenMsg = globals.hiddenMsg;
  const setHiddenMsg = globals.setHiddenMsg;
  const probeCount = globals.probeCount;
  const probeWhen = globals.probeWhen;
  const probeMessage = probeWhen
    ? probeCount + ' (' + probeWhen + ')'
    : '(not set)';
  const guiBarString = globals.guiBar + '';
  const setGuiBar = globals.setGuiBar;
  const queryName = globals.queryName;
  const setQueryName = globals.setQueryName;
  const adminQueries = globals.adminQueries;
  const statusCheckbox = globals.statusCheckbox;
  const setStatusCheckbox = globals.setStatusCheckbox;
  const onlyCheckbox = globals.onlyCheckbox;
  const setOnlyCheckbox = globals.setOnlyCheckbox;
  const lowRange = globals.lowRange;
  const setLowRange = globals.setLowRange;
  const highRange = globals.highRange;
  const setHighRange = globals.setHighRange;
  const scoreSelection = globals.scoreSelection;
  const setScoreSelection = globals.setScoreSelection;

  const filterListMain = [
    'Stickie Only',
    'Unseen Only',
    'Dual Only',
    'Journal Only',
    'No Clusters',
    'No Admin Conf',
    'Only Admin Conf',
  ];
  const filterList =
    roomChoice === 'Plenary' ? filterListMain : [roomChoice, ...filterListMain];
  const statusList = globals['statusList'];

  const { queueExplicitList, setQueueExplicitList } = useGUI();

  let flasher = useFlasher();
  let flash = flasher['flash'];

  /* This function handles the values of the range inputs
         scoreOptionAll, scoreOptionAbove, scoreOptionBelow, scoreOptionRange:
     All scores: lowRange=min, highRange=max
     Above bar: lowRange=bar, highRange=max
     Below bar: lowRange=min, highRange=bar
     In range: both are enabled for freeform input
    */
  function handleScoreSelectionUpdate(selection) {
    const minScore = '-9.0';
    const maxScore = '9.0';
    const disable = selection !== scoreOptionRange ? 'disabled' : '';
    // by default (scoreOptionRange) low and high range values remain
    let lowInput = lowRange;
    let highInput = highRange;
    if (selection === scoreOptionAll) {
      lowInput = minScore;
      highInput = maxScore;
    } else if (selection === scoreOptionAbove) {
      lowInput = guiBarString;
      highInput = maxScore;
    } else if (selection === scoreOptionBelow) {
      lowInput = minScore;
      highInput = guiBarString;
    }
    setScoreSelection(selection);
    setDisableScoreInputs(disable);
    setLowRange(lowInput);
    setHighRange(highInput);
  }

  function getQueueFilterInfo() {
    const statuses = statusList.filter(
      (s, index) => document.getElementById('status-checkbox-' + index).checked,
    );
    const only = filterList.filter(
      (f, index) => document.getElementById('only-checkbox-' + index).checked,
    );
    const data = { roomChoice, statuses, only, lowRange, highRange, queryName };
    return data;
  }

  function handleGetFilterEvent(event, emit) {
    event.preventDefault(); // do not send the form!
    const data = getQueueFilterInfo();
    controlledLog('sending filter info for ' + emit);
    controlledLog(data);
    socketEmit(emit, data);
  }

  function handleGetFilteredCount(event) {
    handleGetFilterEvent(event, 'admin_probe_queue');
  }

  function handleSaveQuery(event) {
    handleGetFilterEvent(event, 'admin_save_query');
  }

  function handleDeleteQuery(event) {
    event.preventDefault(); // do not send the form!
    controlledLog('delete query named: ' + queryName);
    socketEmit('admin_delete_query', queryName);
  }

  function handleLoadQuery(name) {
    controlledLog('load query named: ' + name);
    setQueryName(name);
    socketEmit('admin_load_query', name);
  }

  function handleSetQueueButton(event) {
    event.preventDefault(); // do not send the form!
    const data = getQueueFilterInfo();
    controlledLog('sending queue request:');
    controlledLog(data);
    socketEmit('admin_set_queue', data);
    flash('Sent queue request.', 'success');
  }

  function handleSetQueueExplicitButton(event) {
    event.preventDefault(); // do not send the form! (Is this in form?!?)
    // get value from text field
    // save using: setQueueExplicitList(field)
    controlledLog('sending explicit queue request: ' + queueExplicitList);
    const explicit = queueExplicitList.length ? queueExplicitList : '_CLEAR_';
    const data = { roomChoice, explicit };
    socketEmit('admin_set_queue_explicit', data);
    flash('Sent explicit queue request.', 'success');
  }

  function handleInputChange(event) {
    event.preventDefault(); // do not send the form!
    const target = event.target;
    const name = target.name;
    const value = target.value;
    if (name === 'lowRange') setLowRange(value);
    else if (name === 'highRange') setHighRange(value);
    else if (name === 'message') setHiddenMsg(value);
    else if (name === 'queueExplicit') setQueueExplicitList(value);
    else if (name === 'bar') setGuiBar(value);
    else if (name === 'queryName') setQueryName(value);
  }

  function setTimeInHiddenMessage(msg) {
    const regexp = /_T\+\d+:\d+_/g;
    const matches = msg.match(regexp);
    if (!matches) return msg;
    for (const match of matches) {
      // replace non-digits with whitespace then split on whitespace
      const parts = match.replace(/[^\d]/g, ' ').trim().split(/\s+/);
      const ints = parts.map((i) => parseInt(i));
      const hours = ints[0];
      const mins = ints[1];
      const dateNow = Date.now();
      const utcThen = moment(dateNow).add(hours, 'h').add(mins, 'm').format();
      const thenMomentStr = '===' + utcThen + '===';
      msg = msg.replace(match, thenMomentStr);
    }
    return msg;
  }

  function handleHideQueueCheckbox() {
    const hide = !hideQ;
    setHideQ(hide);
    const message = hide ? setTimeInHiddenMessage(hiddenMsg) : '';
    const data = { roomChoice, hide, message };
    socketEmit('admin_hide_queue', data);
    controlledLog('admin_hide_queue:');
    controlledLog(data);
  }

  function handleRefreshConflictbot(room) {
    socketEmit('admin_refresh_conflictbot', room);
    const msg = "Sent request to Conflictbot to refresh " + room;
    controlledLog(msg);
    // window.alert(msg) // ugly
    flash(msg, 'success'); // nicer
  }

  function handleSetBarButton() {
    controlledLog('bar set:', guiBarString);
    socketEmit('admin_set_bar', guiBarString);
    flash('Bar set to ' + guiBarString + '.', 'success');
  }

  function handleBulkRejectButton() {
    controlledLog('Bulk reject button pressed.');
    let text = 'Are you sure you want to bulk reject below bar?';
    if (window.confirm(text) === true) {
      controlledLog('Bulk reject button confirmed.');
      socketEmit('admin_bulk_reject');
    } else {
      controlledLog('Bulk reject button canceled.');
    }
  }

  function handleClearStickiesButton() {
    controlledLog('Clear stickies button pressed.');
    let text = 'Are you sure you want to clear all stickies?';
    if (window.confirm(text) === true) {
      controlledLog('Clear stickies button confirmed.');
      socketEmit('admin_clear_stickies');
    } else {
      controlledLog('Clear stickies button canceled.');
    }
  }

  return (
    <Container>
      <div>
        <Stack direction="horizontal">
          <Form.Check
            type="checkbox"
            checked={hideQ}
            onChange={handleHideQueueCheckbox}
          />
          <span className="hideQ-text font-size-4">
            Hide queue from everyone except admin, showing...
          </span>
        </Stack>
        <Stack direction="horizontal" className="set-message-row">
          <span className="font-size-4">... this message:</span>
          <input
            name="message"
            value={hiddenMsg}
            onChange={handleInputChange}
            className="message-input"
          />
          <span className="font-size-4">Can use time:&nbsp;</span>
          <span className="font-size-4 text-tty">_T+hh:mm_</span>
        </Stack>
      </div>
      <hr className="horizontal-divider" />
      <div>
        <Stack direction="horizontal" gap={4} className="named-filters">
          <DropdownButton
            title="Queries"
            type="button"
            variant="primary"
            className="select-query-name"
          >
            {adminQueries.map((name, index) => {
              return (
                <Dropdown.Item
                  key={index}
                  as="button"
                  onClick={() => handleLoadQuery(name)}
                >
                  {name}
                </Dropdown.Item>
              );
            })}
          </DropdownButton>
          <input
            name="queryName"
            value={queryName}
            onChange={handleInputChange}
          />
          <Button
            variant="warning"
            onClick={handleSaveQuery}
            className="change-bar-btn"
          >
            Save
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteQuery}
            className="change-bar-btn"
          >
            Delete
          </Button>
        </Stack>
        <p>&nbsp;</p>
        <Stack direction="horizontal" gap={4} className="admin-filters">
          <div>
            <span className="font-size-3">
              <u>Include All</u>:
            </span>
            <br />
            <div key={`status-checkbox`} className="mb-4">
              {statusList.map((label, index) => {
                return (
                  <div key={`status-checkbox-div-` + index}>
                    <Form.Check
                      label={label}
                      type="checkbox"
                      id={`status-checkbox-` + index}
                      checked={statusCheckbox.includes(label)}
                      onChange={() => {
                        if (statusCheckbox.includes(label)) {
                          controlledLog('includes');
                          setStatusCheckbox((oldStatusCheckbox) => {
                            return oldStatusCheckbox.filter(
                              (oldStatus, i) => oldStatus !== label,
                            );
                          });
                        } else {
                          setStatusCheckbox((oldStatusCheckbox) => {
                            return [...oldStatusCheckbox, label];
                          });
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="vr" />
          <div>
            <span className="font-size-3">
              <u>Include Only</u>:
            </span>
            <br />
            <div key={`only-checkbox`} className="mb-0">
              {filterList.map((label, index) => {
                return (
                  <div key={`only-checkbox-div-` + index}>
                    <Form.Check
                      label={label}
                      type="checkbox"
                      id={`only-checkbox-` + index}
                      checked={onlyCheckbox.includes(label)}
                      onChange={() => {
                        if (onlyCheckbox.includes(label)) {
                          setOnlyCheckbox((oldOnlyCheckbox) => {
                            return oldOnlyCheckbox.filter(
                              (oldOnly, i) => oldOnly !== label,
                            );
                          });
                        } else {
                          setOnlyCheckbox((oldOnlyCheckbox) => {
                            return [...oldOnlyCheckbox, label];
                          });
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="vr" />
          <div>
            <Stack direction="vertical" gap={4}>
              <div>
                <span className="font-size-3">
                  <u>Include Scores</u>:
                </span>
              </div>
              <DropdownButton
                id="dropdown-item-button"
                title={scoreSelection}
                className="new-status-dropdown"
                variant="secondary"
                type="button"
              >
                {scoreOptions.map((selection, index) => {
                  return (
                    <Dropdown.Item
                      key={index}
                      as="button"
                      onClick={() => handleScoreSelectionUpdate(selection)}
                    >
                      {selection}
                    </Dropdown.Item>
                  );
                })}
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
          <Stack direction="horizontal" className="get-filtered-count">
            <Button variant="primary" onClick={handleGetFilteredCount}>
              Get Filtered Count
            </Button>
            <span className="font-size-3 get-filtered-count-text">
              Count:&nbsp;{probeMessage}
            </span>
          </Stack>
          <Stack direction="horizontal" className="set-filtered-queue-stack">
            <Button
              variant="primary"
              className="set-filtered-queue-button"
              onClick={handleSetQueueButton}
            >
              Set Filtered Queue
            </Button>
          </Stack>
        </div>
      </div>
      <hr className="horizontal-divider" />
      <div>
        <Stack direction="horizontal">
          <div>
            <input
              name="queueExplicit"
              value={queueExplicitList}
              className="queue-explicit-input"
              onChange={handleInputChange}
            />
            <br />
            <Button
              onClick={handleSetQueueExplicitButton}
              className="queue-explicit-btn"
            >
              Set Explicit Queue
            </Button>
          </div>
          <ul className="queue-explicit-instructions">
            <li className="font-size-4">Empty string ('') to clear queue.</li>
            <li className="font-size-4">Cluster name like 'Cluster-A'.</li>
            <li className="font-size-4">Area name like 'Area-Rendering'.</li>
            <li className="font-size-4">
              Paper number(s) like '101' or '101,103,105,107'.
            </li>
          </ul>
        </Stack>
      </div>
      <div>
        <hr className="horizontal-divider" />
        Conflictbot move users in:&nbsp;&nbsp;
        <Button variant="warning" onClick={()=>handleRefreshConflictbot(roomChoice)}>
        {roomChoice}
        </Button>
        &nbsp;&nbsp;or&nbsp;&nbsp;
        <Button variant="warning" onClick={()=>handleRefreshConflictbot("all_rooms")}>
        All Rooms
        </Button>
        <hr className="horizontal-divider" />
        <Stack direction="horizontal">
          <Button
            variant="warning"
            onClick={handleSetBarButton}
            className="change-bar-btn"
          >
            Change Bar
          </Button>
          <input name="bar" value={guiBarString} onChange={handleInputChange} />
        </Stack>
        <hr className="horizontal-divider" />
        <Button variant="warning" onClick={handleClearStickiesButton}>
          Clear Stickies
        </Button>
        &nbsp;&nbsp;Clear all stickies.
        <hr className="horizontal-divider" />
        <Button variant="warning" onClick={handleBulkRejectButton}>
          Bulk Reject
        </Button>
        &nbsp;&nbsp;Mark status of all reject papers below bar as already
        discussed.
      </div>
    </Container>
  );
}
