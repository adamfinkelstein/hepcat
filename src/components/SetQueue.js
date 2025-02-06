import moment from 'moment';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
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
import ScoreFilter from './ScoreFilter';

const replaceBreakingSpaces = (str) => {
  // replace all spaces with non-breaking spaces
  return str.replace(/ /g, '\u00A0');
};

const formatCheckboxLabel = (label) => {
  label = label.replace('Above', 'Above \u2265'); // ≥
  label = label.replace('Below', 'Below \u003C'); // <
  label = replaceBreakingSpaces(label);
  return label;
};

export default function SetQueue() {
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
    aboveScore,
    setAboveScore,
    belowScore,
    setBelowScore,
    useAboveScore,
    setUseAboveScore,
    useBelowScore,
    setUseBelowScore,
  } = useFilterContext();
  const qMsgLabel = hideQ ? 'Queue hidden with:' : 'Hide queue message:';
  const genericFilterName = 'My_GUI_filter';
  const exampleFilter =
    allGuiFilterNames && allGuiFilterNames.length
      ? allGuiFilterNames[0]
      : genericFilterName;

  const showQMessageTime = false;

  const filterList = [
    'This Room Only',
    'Sticky Only',
    'Unseen Only',
    'No Presumed-R',
    'Dual Only',
    'Journal Only',
    'No Clusters',
    'No Admin Conf',
    'Only Admin Conf',
    'Above Bar',
    'Below Bar',
  ];

  const mutuallyExclusive = [
    ['Dual Only', 'Journal Only'],
    ['No Admin Conf', 'Only Admin Conf'],
    ['Below Bar', 'Above Bar'],
  ];

  // Convert from checkbox label to its id:
  // -- Prefix with "checkbox-".
  // -- Use lower case.
  // -- Replace other chars with hyphen.
  // -- eg: "This Room Only" -> "checkbox-this-room-only".
  function checkLabelToId(label) {
    const lower = label.toLowerCase();
    const alpha = lower.replace(/^a-z+/g, '-');
    return 'checkbox-' + alpha;
  }

  function checkLabelIsChecked(label) {
    const id = checkLabelToId(label);
    const box = document.getElementById(id);
    return box.checked;
  }

  function listWithoutItem(lst, remove) {
    return lst.filter((item) => item !== remove);
  }

  function getCheckedBoxes(boxList, prevent) {
    let result = boxList.filter(checkLabelIsChecked);
    if (prevent) {
      result = listWithoutItem(result, prevent);
    }
    return result;
  }

  function handleStatusCheckClick() {
    const checked = getCheckedBoxes(statusList, null);
    setStatusCheckbox(checked);
    controlledLog('checked:', checked);
  }

  function excludedPartner(label) {
    for (const pair of mutuallyExclusive) {
      if (pair.includes(label)) {
        const partner = pair.filter((item) => item !== label)[0];
        return partner;
      }
    }
    return null;
  }

  // Disable mutually exclusive checkboxes.
  // For example, if you check "Below Bar" then disable
  // both "Above Bar" and "Below Score" on the right.
  // Also when unchecking a box, reset the score to default.
  function handleOnlyCheckClick(label, isChecked) {
    const prevent = excludedPartner(label);
    const checked = getCheckedBoxes(filterList, prevent);
    setOnlyCheckbox(checked);
    if (label === 'Below Bar' && isChecked) {
      setUseBelowScore(false);
      setBelowScore(9);
    } else if (label === 'Above Bar' && isChecked) {
      setUseAboveScore(false);
      setAboveScore(-9);
    }
  }

  function gatherGuiFilterSettings() {
    const statuses = statusCheckbox;
    const only = onlyCheckbox;
    const filterName = guiFilterName;
    const data = {
      roomChoice,
      statuses,
      only,
      useAboveScore,
      useBelowScore,
      aboveScore,
      belowScore,
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
      revealModalDialog({ title: 'Error', message: msg });
      return;
    }
    if (allTextFilterNames.includes(guiFilterName)) {
      const msg =
        'Sorry filter name "' +
        guiFilterName +
        '" is already in use for a text filter and therefore ' +
        'cannot be used for a GUI filter.';
      revealModalDialog({ title: 'Error', message: msg });
      return;
    }
    emitAdminFilterMsg('admin_save_filter');
  }

  function handleSaveTextFilter() {
    const problem = filterNameNotOK(textFilterName);
    if (problem) {
      const msg = 'Bad filter name (' + textFilterName + ') -- ' + problem;
      revealModalDialog({ title: 'Error', message: msg });
      return;
    }
    if (allGuiFilterNames.includes(textFilterName)) {
      const msg =
        'Sorry filter name "' +
        textFilterName +
        '" is already in use for a GUI filter and therefore ' +
        'cannot be used for a text filter.';
      revealModalDialog({ title: 'Error', message: msg });
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
    // flash('Sent request for paper count.', 'success');
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
    if (name === 'message') setHiddenMsg(value);
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

  /*
   * The next three functions serve two purposes:
   * 1. If a score checkbox is unchecked, reset score.
   * 2. If a score checkbox is checked, uncheck the bar checkbox.
   */
  function updateScoreCheck(checked, setUseScore, setScore, reset, prevent) {
    setUseScore(checked);
    if (!checked) {
      setScore(reset);
    } else if (onlyCheckbox.includes(prevent)) {
      const update = listWithoutItem(onlyCheckbox, prevent);
      setOnlyCheckbox(update);
    }
  }

  function updateAboveScoreCheck(checked) {
    updateScoreCheck(checked, setUseAboveScore, setAboveScore, -9, 'Above Bar');
  }

  function updateBelowScoreCheck(checked) {
    updateScoreCheck(checked, setUseBelowScore, setBelowScore, 9, 'Below Bar');
  }

  return (
    <Container fluid className="SetQueue">
      <div>
        <h2>Hide Queue</h2>
        <Stack direction="horizontal" gap={2}>
          <span>{qMsgLabel}</span>
          <input
            name="message"
            value={hiddenMsg}
            onChange={handleInputChange}
            className="q-message-input"
            disabled={hideQ}
          />
          {showQMessageTime && (
            <>
              <span>Can use time:&nbsp;</span>
              <span className="text-tty">_T+hh:mm_</span>
            </>
          )}
        </Stack>
        <Stack direction="horizontal" gap={2}>
          <Form.Check
            type="checkbox"
            checked={hideQ}
            onChange={handleHideQueueCheckbox}
          />
          <span>Hide queue now.</span>
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
        <Stack direction="horizontal" gap={4} className="gui-filters my-4 mx-3">
          <div>
            <span className="underline bigger-font">Union</span>:
            <br />
            <div className="mb-4">
              {statusList.map((label) => {
                const checked = statusCheckbox.includes(label);
                const id = checkLabelToId(label);
                return (
                  <Form.Check
                    key={id}
                    id={id}
                    label={label}
                    type="checkbox"
                    checked={checked}
                    onChange={handleStatusCheckClick}
                  />
                );
              })}
            </div>
          </div>
          <div className="vr" />
          <div>
            <span className="underline bigger-font">Intersection</span>:
            <br />
            <div className="mb-0">
              {filterList.map((label) => {
                const checked = onlyCheckbox.includes(label);
                const id = checkLabelToId(label);
                return (
                  <Form.Check
                    key={id}
                    id={id}
                    label={formatCheckboxLabel(label)}
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleOnlyCheckClick(label, !checked)}
                  />
                );
              })}
            </div>
          </div>
          <div className="vr" />
          <div>
            <Stack direction="vertical" gap={4}>
              <div>
                <span className="underline bigger-font">
                  Intersect&nbsp;Scores
                </span>
                :
              </div>
              <ScoreFilter
                checkboxLabel={formatCheckboxLabel('Above')}
                isChecked={useAboveScore}
                updateChecked={updateAboveScoreCheck}
                score={aboveScore}
                updateScore={setAboveScore}
              />
              <ScoreFilter
                checkboxLabel={formatCheckboxLabel('Below')}
                isChecked={useBelowScore}
                updateChecked={updateBelowScoreCheck}
                score={belowScore}
                updateScore={setBelowScore}
              />
            </Stack>
          </div>
        </Stack>
        <Stack direction="vertical" gap={2}>
          <Stack direction="horizontal" gap={2} className="get-filtered-count">
            <Button variant="secondary" onClick={handleGetFilteredCount}>
              Get Count
            </Button>
            <span className="get-filtered-count-text">
              Count:&nbsp;{probeGUIMsg}
            </span>
          </Stack>
          <Stack
            direction="horizontal"
            gap={2}
            className="set-filtered-queue-stack"
          >
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
        </Stack>
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
        <div>Enter text filter here:</div>
        <input
          name="textFilterBox"
          value={textFilterBox}
          className="text-filter-input"
          onChange={handleInputChange}
        />
        <Stack direction="vertical" gap={2}>
          <Container fluid>
            <ul className="text-filter-instructions">
              <li>
                Room:{roomChoice} / Area:Geometry / Cluster:A / Bar:Above /
                Filter:
                {exampleFilter}
              </li>
              <li>101 / 101,103,105,107</li>
              <li>
                AND( OR(Room:Room_A, NOT(Area:Geometry)), {exampleFilter})
              </li>
            </ul>
          </Container>
          <Stack direction="horizontal" gap={2}>
            <Button variant="secondary" onClick={handleGetFilteredCountText}>
              Get Count
            </Button>
            <span className="get-filtered-count-text">
              Count: {probeTextMsg}
            </span>
          </Stack>
          <Stack direction="horizontal" gap={2}>
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
