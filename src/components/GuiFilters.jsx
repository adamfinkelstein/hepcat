import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFilterContext } from '../contexts/FilterContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useCount } from '../contexts/CountContext';
import SaveFilters from './SaveFilters';
import ScoreFilter from './ScoreFilter';
import CheckGroup from './CheckGroup';

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

export default function GuiFilters() {
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
  const { roomChoice } = useUser();
  const { flash } = useFlasher();
  const { allStatuses } = useCount();
  const { probeGUIMsg } = useAdmin();
  const {
    allGuiFilterNames,
    allTextFilterNames,
    guiFilterName,
    setGuiFilterName,
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

  const filterList = [
    'This Room Only',
    'Dual Only',
    'Journal Only',
    'No Clusters',
    'No Chair Conf',
    'Only Chair Conf',
    'Above Bar',
    'Below Bar',
  ];

  const mutuallyExclusive = [
    ['Ready Only', 'Sticky Only'],
    ['Dual Only', 'Journal Only'],
    ['No Chair Conf', 'Only Chair Conf'],
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
    const checked = getCheckedBoxes(allStatuses, null);
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

  function guiSettingsAsText() {
    const statuses = statusCheckbox.map((s) => 'Grid:' + s);
    const statusOr = 'OR( ' + statuses.join(', ') + ' )';
    const roomText = 'This Room Only';
    const thisRoom = onlyCheckbox.includes(roomText);
    const onlyNoRoom = onlyCheckbox.filter((o) => o !== roomText);
    const only = onlyNoRoom.map(
      (o) => 'Check:' + o.replace(/[^a-zA-Z]+/g, '_')
    );
    if (statuses.length === 0) {
      return 'None';
    }
    const statusOrClause = statuses.length === 1 ? statuses[0] : statusOr;
    const allStatusesChecked = statuses.length === allStatuses.length;
    const statusClause = allStatusesChecked ? 'All' : statusOrClause;
    const topAnds = [statusClause];
    if (thisRoom) {
      topAnds.push('Room:This');
    }
    if (only.length) {
      topAnds.push(...only);
    }
    if (useAboveScore) {
      topAnds.push('Above:' + aboveScore);
    }
    if (useBelowScore) {
      topAnds.push('Below:' + belowScore);
    }
    if (topAnds.length > 1 && topAnds[0] === 'All') {
      topAnds.shift(); // remove statuses if all four selected
    }
    if (topAnds.length === 1) {
      return topAnds[0];
    }
    const filterText = 'AND( ' + topAnds.join(', ') + ' )';
    // controlledLog('gui filter text:', filterText);
    return filterText;
  }

  function handleGetTextFilterButton() {
    const msg = guiSettingsAsText();
    revealModalDialog({ title: 'Equivalent Text Filter', message: msg });
  }

  function emitAdminFilterMsg(msgToEmit) {
    const data = gatherGuiFilterSettings();
    controlledLog('sending filter info for ' + msgToEmit);
    controlledLog(data);
    socketEmit(msgToEmit, data);
  }

  function filterNameProblem(filterName) {
    const firstLetter = /^[a-zA-Z]/;
    const firstIsLetter = filterName.match(firstLetter);
    if (!firstIsLetter) return 'must start with a letter.';
    const nonAlphaNum = /\W/;
    const hasNonAlphaNum = filterName.match(nonAlphaNum);
    if (hasNonAlphaNum) return 'only letters, digits or underscore allowed.';
    return false;
  }

  function handleGetFilteredCount() {
    guiSettingsAsText();
    emitAdminFilterMsg('admin_probe_by_gui');
  }

  function handleSetQueueButton() {
    emitAdminFilterMsg('admin_set_queue_by_gui');
    flash('Sent queue request.', 'success');
  }

  function handleGuiFilterSave() {
    const problem = filterNameProblem(guiFilterName);
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

  function handleGuiFilterDelete() {
    controlledLog('delete named filter: ' + guiFilterName);
    socketEmit('admin_delete_filter', guiFilterName);
    setGuiFilterName('');
  }

  function handleGuiFilterLoad(name) {
    controlledLog('load gui filter: ' + name);
    setGuiFilterName(name);
    socketEmit('admin_load_filter', name);
  }

  function handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    if (name === 'guiFilterName') setGuiFilterName(value);
  }

  function handleClearQueueButton() {
    controlledLog('sending clear queue request');
    const explicit = '';
    const data = { roomChoice, explicit };
    socketEmit('admin_set_queue_by_text', data);
    flash('Sent clear queue request.', 'success');
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
    <div className="GuiFilters">
      <h2>GUI Filters</h2>
      <SaveFilters
        isGUI={true}
        inputBoxName={'guiFilterName'}
        filterName={guiFilterName}
        allFilterNames={allGuiFilterNames}
        handleLoadFilter={handleGuiFilterLoad}
        handleSaveFilter={handleGuiFilterSave}
        handleDeleteFilter={handleGuiFilterDelete}
        handleInputChange={handleInputChange}
      />
      <Stack direction="horizontal" gap={4} className="gui-filters my-4 mx-3">
        <div>
          <span className="underline bigger-font">Grid Status</span>:
          <br />
          <CheckGroup
            checkLabels={allStatuses}
            alreadyCheckedList={statusCheckbox}
            checkLabelToId={checkLabelToId}
            handleCheckClick={handleStatusCheckClick}
          />
        </div>
        <div className="vr" />
        <div>
          <span className="underline bigger-font">Intersection</span>:
          <br />
          <CheckGroup
            checkLabels={filterList}
            alreadyCheckedList={onlyCheckbox}
            checkLabelToId={checkLabelToId}
            handleCheckClick={handleOnlyCheckClick}
          />
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
          gap={3}
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
          <Button variant="secondary" onClick={handleGetTextFilterButton}>
            Get Text Filter
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
