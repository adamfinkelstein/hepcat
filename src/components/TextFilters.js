import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { Container } from 'react-bootstrap';
import { useState } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFilterContext } from '../contexts/FilterContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import SaveFilters from './SaveFilters';

export default function TextFilters() {
  const [noTSP, setNoTSP] = useState(false);
  const { controlledLog } = useControlledLog();
  const { socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
  const { roomChoice } = useUser();
  const { flash } = useFlasher();
  const { probeTextMsg } = useAdmin();
  const {
    allGuiFilterNames,
    allTextFilterNames,
    textFilterName,
    setTextFilterName,
    textFilterInput,
    setTextFilterInput,
  } = useFilterContext();
  const genericFilterName = 'My_GUI_filter';
  const exampleFilter =
    allGuiFilterNames && allGuiFilterNames.length
      ? allGuiFilterNames[0]
      : genericFilterName;

  function filterNameNotOK(filterName) {
    const firstLetter = /^[a-zA-Z]/;
    const firstIsLetter = filterName.match(firstLetter);
    if (!firstIsLetter) return 'must start with a letter.';
    const nonAlphaNum = /\W/;
    const hasNonAlphaNum = filterName.match(nonAlphaNum);
    if (hasNonAlphaNum) return 'only letters, digits or underscore allowed.';
    return false;
  }

  function handleTextFilterSave() {
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
    const data = { filterName: textFilterName, text: textFilterInput };
    socketEmit('admin_save_filter', data);
  }

  function handleGetFilteredCountText() {
    controlledLog('sending probe queue request: ' + textFilterInput);
    const explicit = textFilterInput;
    const data = { roomChoice, explicit };
    socketEmit('admin_probe_by_text', data);
    // flash('Sent request for paper count.', 'success');
  }

  function handleTextFilterDelete() {
    controlledLog('delete named filter: ' + textFilterName);
    socketEmit('admin_delete_filter', textFilterName);
    setTextFilterName('');
  }

  function handleTextFilterLoad(name) {
    controlledLog('load text filter: ' + name);
    setTextFilterName(name);
    socketEmit('admin_load_filter', name);
  }

  function handleSendTextFilterButton() {
    controlledLog('sending explicit queue request: ' + textFilterInput);
    const explicit = textFilterInput;
    const data = { roomChoice, explicit, noTSP };
    socketEmit('admin_set_queue_by_text', data);
    flash('Sent queue request.', 'success');
  }

  function handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    if (name === 'textFilterInput') setTextFilterInput(value);
    else if (name === 'textFilterName') setTextFilterName(value);
  }

  return (
    <div className="TextFilters">
      <h2>Text Filters</h2>
      <SaveFilters
        isGUI={false}
        inputBoxName={'textFilterName'}
        filterName={textFilterName}
        allFilterNames={allTextFilterNames}
        handleLoadFilter={handleTextFilterLoad}
        handleSaveFilter={handleTextFilterSave}
        handleDeleteFilter={handleTextFilterDelete}
        handleInputChange={handleInputChange}
      />
      <br />
      <div>Enter text filter here:</div>
      <input
        name="textFilterInput"
        value={textFilterInput}
        className="text-filter-input"
        onChange={handleInputChange}
      />
      <Stack direction="vertical" gap={2}>
        <Container fluid>
          <ul className="text-filter-instructions">
            <li>101 / 101,103,105,107</li>
            <li>
              Room:{roomChoice} / Area:Geometry / Cluster:A / Filter:
              {exampleFilter}
            </li>
            <li>AND( OR(Room:Room_A, NOT(Area:Geometry)), {exampleFilter})</li>
          </ul>
        </Container>
        <Stack direction="horizontal" gap={2}>
          <Button variant="secondary" onClick={handleGetFilteredCountText}>
            Get Count
          </Button>
          <span className="get-filtered-count-text">Count: {probeTextMsg}</span>
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
  );
}
