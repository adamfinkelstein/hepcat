import moment from 'moment';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Stack from 'react-bootstrap/Stack';
import { Container } from 'react-bootstrap';
import { useState } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useFilterContext } from '../contexts/FilterContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import SaveFilters from './SaveFilters';

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
  const [noTSP, setNoTSP] = useState(false);
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
  const { roomChoice } = useUser();
  const { flash } = useFlasher();
  const {
    hideQ,
    setHideQ,
    hiddenMsg,
    setHiddenMsg,
    guiBar,
    setGuiBar,
    probeGUIMsg,
    probeTextMsg,
    statusList,
  } = useAppGlobals();
  const {
    allGuiFilterNames,
    allTextFilterNames,
    guiFilterName,
    setGuiFilterName,
    textFilterName,
    setTextFilterName,
    textFilterBox,
    setTextFilterBox,
    statusCheckbox,
    setStatusCheckbox,
    onlyCheckbox,
    setOnlyCheckbox,
    lowRange,
    setLowRange,
    highRange,
    setHighRange,
    scoreSelection,
    setScoreSelection,
  } = useFilterContext();
  const guiBarString = guiBar + '';
  const qMsgLabel = hideQ ? 'Queue hidden with:' : 'Hide queue message:';
  const exampleFilter = 'My_GUI_filter';

  const showQMessageTime = false;

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

  /* This function handles the values of the range inputs
      scoreOptionAll, scoreOptionAbove, scoreOptionBelow, scoreOptionRange:
     All scores: lowRange=min, highRange=max
     Above bar: lowRange=bar, highRange=max
     Below bar: lowRange=min, highRange=bar
     In range: both are enabled for freeform input.
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

  function gatherGuiFilterSettings() {
    const statuses = statusCheckbox;
    const only = onlyCheckbox;
    const filterName = guiFilterName;
    const data = {
      roomChoice,
      statuses,
      only,
      lowRange,
      highRange,
      filterName,
    };
    return data;
  }

  function emitAdminFilterMsg(msgToEmit) {
    const data = gatherGuiFilterSettings();
    controlledLog('sending filter info for ' + msgToEmit);
    controlledLog(data);
    socketEmit(msgToEmit, data);
  }

  function filterNameNotOK(filterName) {
    const firstLetter = /^[a-zA-Z]/;
    const firstIsLetter = filterName.match(firstLetter);
    if (!firstIsLetter) return 'must start with a letter.';
    const nonAlphaNum = /\W/;
    const hasNonAlphaNum = filterName.match(nonAlphaNum);
    if (hasNonAlphaNum) return 'only letters, digits or underscore allowed.';
    return false;
  }

  function handleGetFilteredCount() {
    emitAdminFilterMsg('admin_probe_queue');
  }

  function handleSetQueueButton() {
    emitAdminFilterMsg('admin_set_queue');
    flash('Sent queue request.', 'success');
  }

  function handleSaveGuiFilter() {
    const problem = filterNameNotOK(guiFilterName);
    if (problem) {
      const msg = 'Bad filter name (' + guiFilterName + ') -- ' + problem;
      revealModalDialog('Error', msg);
      return;
    }
    if (allTextFilterNames.includes(guiFilterName)) {
      const msg =
        'Sorry filter name "' +
        guiFilterName +
        '" is already in use for a text filter and therefore ' +
        'cannot be used for a GUI filter.';
      revealModalDialog('Error', msg);
      return;
    }
    emitAdminFilterMsg('admin_save_filter');
  }

  function handleSaveTextFilter() {
    const problem = filterNameNotOK(textFilterName);
    if (problem) {
      const msg = 'Bad filter name (' + textFilterName + ') -- ' + problem;
      revealModalDialog('Error', msg);
      return;
    }
    if (allGuiFilterNames.includes(textFilterName)) {
      const msg =
        'Sorry filter name "' +
        textFilterName +
        '" is already in use for a GUI filter and therefore ' +
        'cannot be used for a text filter.';
      revealModalDialog('Error', msg);
      return;
    }
    const data = { filterName: textFilterName, text: textFilterBox };
    socketEmit('admin_save_filter', data);
  }

  function handleGetFilteredCountText() {
    controlledLog('sending probe queue request: ' + textFilterBox);
    const explicit = textFilterBox;
    const data = { roomChoice, explicit };
    socketEmit('admin_probe_text', data);
    flash('Sent request for paper count.', 'success');
  }

  function handleDeleteGuiFilter() {
    controlledLog('delete named filter: ' + guiFilterName);
    socketEmit('admin_delete_filter', guiFilterName);
    setGuiFilterName('');
  }

  function handleDeleteTextFilter() {
    controlledLog('delete named filter: ' + textFilterName);
    socketEmit('admin_delete_filter', textFilterName);
    setTextFilterName('');
  }

  function handleLoadGuiFilter(name) {
    controlledLog('load gui filter: ' + name);
    setGuiFilterName(name);
    socketEmit('admin_load_filter', name);
  }

  function handleLoadTextFilter(name) {
    controlledLog('load text filter: ' + name);
    setTextFilterName(name);
    socketEmit('admin_load_filter', name);
  }

  function handleClearQueueButton() {
    controlledLog('sending clear queue request');
    const explicit = '';
    const data = { roomChoice, explicit };
    socketEmit('admin_set_text_filter', data);
    flash('Sent clear queue request.', 'success');
  }

  function handleSendTextFilterButton() {
    controlledLog('sending explicit queue request: ' + textFilterBox);
    const explicit = textFilterBox;
    const data = { roomChoice, explicit, noTSP };
    socketEmit('admin_set_text_filter', data);
    flash('Sent queue request.', 'success');
  }

  function handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    if (name === 'lowRange') setLowRange(value);
    else if (name === 'highRange') setHighRange(value);
    else if (name === 'message') setHiddenMsg(value);
    else if (name === 'textFilterBox') setTextFilterBox(value);
    else if (name === 'bar') setGuiBar(value);
    else if (name === 'guiFilterName') setGuiFilterName(value);
    else if (name === 'textFilterName') setTextFilterName(value);
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

  return (
    <Container>
      <div>
        <h2>Hide Queue</h2>
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
        <SaveFilters
          isGUI={true}
          inputBoxName={'guiFilterName'}
          filterName={guiFilterName}
          allFilterNames={allGuiFilterNames}
          handleLoadFilter={handleLoadGuiFilter}
          handleSaveFilter={handleSaveGuiFilter}
          handleDeleteFilter={handleDeleteGuiFilter}
          handleInputChange={handleInputChange}
        />
        <p>&nbsp;</p>
        <Stack direction="horizontal" gap={4} className="admin-filters">
          <div>
            <span className="font-size-3">
              <u>Union</u>:
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
              <u>Intersection</u>:
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
                  <u>Intersect Scores</u>:
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
        <SaveFilters
          isGUI={false}
          inputBoxName={'textFilterName'}
          filterName={textFilterName}
          allFilterNames={allTextFilterNames}
          handleLoadFilter={handleLoadTextFilter}
          handleSaveFilter={handleSaveTextFilter}
          handleDeleteFilter={handleDeleteTextFilter}
          handleInputChange={handleInputChange}
        />
        <br />
        <div class="font-size-4">Enter text filter here:</div>
        <input
          name="textFilterBox"
          value={textFilterBox}
          className="text-filter-input"
          onChange={handleInputChange}
        />
        <Stack direction="vertical">
          <Container>
            <ul className="text-filter-instructions">
              <li className="font-size-4">
                Room:Room_A / Area:Geometry / Cluster:A / Filter:
                {exampleFilter}
              </li>
              <li className="font-size-4">101 / 101,103,105,107</li>
              <li className="font-size-4">
                AND( OR(Room:Room_A, NOT(Area:Geometry)), {exampleFilter})
              </li>
            </ul>
          </Container>
          <Stack direction="horizontal">
            <Button variant="secondary" onClick={handleGetFilteredCountText}>
              Get Count
            </Button>
            <span className="font-size-4 get-filtered-count-text">
              Count: {probeTextMsg}
            </span>
          </Stack>
          <Stack direction="horizontal">
            <Button
              onClick={handleSendTextFilterButton}
              className="text-filter-btn"
            >
              Set Queue
            </Button>
            <Form.Check
              className="no-tsp"
              label="No TSP"
              type="checkbox"
              checked={noTSP}
              onChange={() => {
                setNoTSP(!noTSP);
              }}
            />
          </Stack>
        </Stack>
      </div>
    </Container>
  );
}
