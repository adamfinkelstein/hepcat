import moment from 'moment';
import { Container } from 'react-bootstrap';
import { useState } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useGUI } from '../contexts/GUIContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
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
  const { roomChoice, conflictbot } = useUser();
  const { textFilterBox, setTextFilterBox } = useGUI();
  const globals = useAppGlobals();
  const { revealModalDialog } = useModalDialog();
  const hideQ = globals.hideQ;
  const qMsgLabel = hideQ ? 'Queue hidden with:' : 'Hide queue message:';
  const setHideQ = globals.setHideQ;
  const hiddenMsg = globals.hiddenMsg;
  const setHiddenMsg = globals.setHiddenMsg;
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
  const probeGUIMsg = globals.probeGUIMsg;
  const probeTextMsg = globals.probeTextMsg;

  const exampleQuery = adminQueries.length ? adminQueries[0] : 'MyQuery';
  const showQMessageTime = false;

  const { flash } = useFlasher();

  const filterList = [
    'This Room Only',
    'Sticky Only',
    'Unseen Only',
    'Dual Only',
    'Journal Only',
    'No Clusters',
    'No Admin Conf',
    'Only Admin Conf',
  ];
  const statusList = globals['statusList'];

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

  function getCheckedBoxes(boxList, namePrefix) {
    return boxList.filter(
      (_item, index) => document.getElementById(namePrefix + index).checked,
    );
  }

  function handleStatusCheckClick() {
    const checked = getCheckedBoxes(statusList, 'status-checkbox-');
    setStatusCheckbox(checked);
  }

  function handleOnlyCheckClick() {
    const checked = getCheckedBoxes(filterList, 'only-checkbox-');
    setOnlyCheckbox(checked);
  }

  function getQueueFilterInfo() {
    const statuses = statusCheckbox;
    const only = onlyCheckbox;
    const data = { roomChoice, statuses, only, lowRange, highRange, queryName };
    return data;
  }

  function queryNameNotOK() {
    const firstLetter = /^[a-zA-Z]/;
    const firstIsLetter = queryName.match(firstLetter);
    if (!firstIsLetter) return 'must start with a letter.';
    const nonAlphaNum = /\W/;
    const hasNonAlphaNum = queryName.match(nonAlphaNum);
    if (hasNonAlphaNum) return 'only letters, digits or underscore allowed.';
    return false;
  }

  function emitFilterRequest(emit) {
    const data = getQueueFilterInfo();
    controlledLog('sending filter info for ' + emit);
    controlledLog(data);
    socketEmit(emit, data);
  }

  function handleSaveQuery() {
    const problem = queryNameNotOK();
    if (problem) {
      const msg = 'Bad query name (' + queryName + ') -- ' + problem;
      revealModalDialog('Error', msg);
      return;
    }
    emitFilterRequest('admin_save_query');
  }

  function handleGetFilteredCount() {
    emitFilterRequest('admin_probe_queue');
  }

  function handleGetFilteredCountText() {
    controlledLog('sending probe queue request: ' + textFilterBox);
    const explicit = textFilterBox;
    const data = { roomChoice, explicit };
    socketEmit('admin_probe_text', data);
    flash('Sent request for paper count.', 'success');
  }

  function handleDeleteQuery() {
    controlledLog('delete named filter: ' + queryName);
    socketEmit('admin_delete_query', queryName);
  }

  function handleLoadQuery(name) {
    controlledLog('load named filter: ' + name);
    setQueryName(name);
    socketEmit('admin_load_query', name);
  }

  function handleSetQueueButton() {
    const data = getQueueFilterInfo();
    controlledLog('sending queue request:');
    controlledLog(data);
    socketEmit('admin_set_queue', data);
    flash('Sent queue request.', 'success');
  }

  function handleClearQueueButton() {
    controlledLog('sending clear queue request');
    const explicit = '';
    const data = { roomChoice, explicit };
    socketEmit('admin_set_queue_explicit', data);
    flash('Sent clear queue request.', 'success');
  }

  function handleSetQueueExplicitButton() {
    controlledLog('sending explicit queue request: ' + textFilterBox);
    const explicit = textFilterBox;
    const data = { roomChoice, explicit };
    socketEmit('admin_set_queue_explicit', data);
    flash('Sent explicit queue request.', 'success');
  }

  function handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    if (name === 'lowRange') setLowRange(value);
    else if (name === 'highRange') setHighRange(value);
    else if (name === 'message') setHiddenMsg(value);
    else if (name === 'queueExplicit') setTextFilterBox(value);
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

  function handleRefreshConflictbot(inAllRooms) {
    if (!conflictbot) return;
    let confirmAllRooms =
      'Are you sure you want to update ALL rooms? Only click this if you are the Chair/Lead. This is should never be done while discussion rooms are running. --Kayvon';
    if (inAllRooms && window.confirm(confirmAllRooms) !== true) {
      const msg = 'This Conflictbot refresh (all rooms) was canceled.';
      controlledLog(msg);
      flash(msg, 'warning');
    } else {
      let room = inAllRooms ? 'ALL_ROOMS' : roomChoice;
      socketEmit('admin_refresh_conflictbot', room);
      const msg = 'Sent request to Conflictbot to refresh ' + room;
      controlledLog(msg);
      flash(msg, 'success');
    }
  }

  function handleSetBarButton() {
    controlledLog('bar set:', guiBarString);
    socketEmit('admin_set_bar', guiBarString);
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
        <Stack direction="horizontal" className="set-message-row">
          <span className="font-size-4">{qMsgLabel}</span>
          <input
            name="message"
            value={hiddenMsg}
            onChange={handleInputChange}
            className="message-input"
            disabled={hideQ}
          />
          {showQMessageTime && (
            <>
              <span className="font-size-4">Can use time:&nbsp;</span>
              <span className="font-size-4 text-tty">_T+hh:mm_</span>
            </>
          )}
        </Stack>
        <Stack direction="horizontal">
          <Form.Check
            type="checkbox"
            checked={hideQ}
            onChange={handleHideQueueCheckbox}
          />
          <span className="hideQ-text font-size-4">Hide queue now.</span>
        </Stack>
      </div>
      <hr className="horizontal-divider" />
      <div>
        <h2>GUI Filters</h2>
        <Stack direction="horizontal" gap={4} className="named-filters">
          <DropdownButton
            title="Saved GUI Filters"
            type="button"
            variant="secondary"
            drop="end"
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
                      onChange={handleStatusCheckClick}
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
                      onChange={handleOnlyCheckClick}
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
            <Button variant="secondary" onClick={handleGetFilteredCount}>
              Get Count
            </Button>
            <span className="font-size-4 get-filtered-count-text">
              Count:&nbsp;{probeGUIMsg}
            </span>
          </Stack>
          <Stack direction="horizontal" className="set-filtered-queue-stack">
            <Button
              variant="primary"
              className="set-filtered-queue-button"
              onClick={handleSetQueueButton}
            >
              Set Queue
            </Button>
            <Button
              variant="warning"
              className="set-filtered-queue-button"
              onClick={handleClearQueueButton}
            >
              Clear Queue
            </Button>
          </Stack>
        </div>
      </div>
      <hr className="horizontal-divider" />
      <div>
        <h2>Text Filters</h2>
        <input
          name="queueExplicit"
          value={textFilterBox}
          className="text-filter-input"
          onChange={handleInputChange}
        />
        <br />
        &nbsp;
        <br />
        <Stack direction="horizontal">
          <div>
            <Button variant="secondary" onClick={handleGetFilteredCountText}>
              Get Count
            </Button>
            <br />
            <Button
              onClick={handleSetQueueExplicitButton}
              className="text-filter-btn"
            >
              Set Queue
            </Button>
          </div>
          <div>
            <ul className="text-filter-instructions">
              <li className="font-size-4">Count: {probeTextMsg}</li>
              <li className="font-size-4">
                Room:Plenary / Area:Geometry / Cluster:A / Query:{exampleQuery}
              </li>
              <li className="font-size-4">101 / 101,103,105,107</li>
              <li className="font-size-4">
                AND( OR(Room:Plenary, NOT(Area:Geometry)), {exampleQuery})
              </li>
            </ul>
          </div>
        </Stack>
      </div>
      <div>
        {conflictbot && (
          <div>
            <hr className="horizontal-divider" />
            Conflictbot move users in:&nbsp;&nbsp;
            <Button
              variant="warning"
              onClick={() => handleRefreshConflictbot(false)}
            >
              {roomChoice}
            </Button>
            &nbsp;&nbsp;or&nbsp;&nbsp;
            <Button
              variant="warning"
              onClick={() => handleRefreshConflictbot(true)}
            >
              All Rooms
            </Button>
          </div>
        )}
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
