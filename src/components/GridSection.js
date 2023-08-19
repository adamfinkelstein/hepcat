import Container from 'react-bootstrap/Container';
import Stack from 'react-bootstrap/Stack';
import Grid from './Grid.js';
import { useState } from 'react';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useAppGlobals } from '../contexts/AppContext';
import ColorsDisplay from './ColorsDisplay';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Button from 'react-bootstrap/Button';
import ChooseStatusDropdown from './ChooseStatusDropdown.js';
import { useControlledLog } from '../contexts/ControlledLogContext.js';

export default function GridSection() {
  const [gridDisplay, setGridDisplay] = useState('Normal');
  const { socketEmit } = useSocketIO();
  const globals = useAppGlobals();
  const guiBar = globals.guiBar;
  const grid = globals.grid;
  const gridCountAbove = grid && grid.above_oids ? grid.above_oids.length : 0;
  const gridCountBelow = grid && grid.below_oids ? grid.below_oids.length : 0;
  const gridNidsAbove = grid && grid.above_nids ? grid.above_nids.length : 0;
  const gridNidsBelow = grid && grid.below_nids ? grid.below_nids.length : 0;
  const papersTotal = gridCountAbove + gridCountBelow;
  const papersConflicted = papersTotal - gridNidsAbove - gridNidsBelow;
  const checkValidNID = globals.checkValidNID;
  const setModalTitle = globals.setModalTitle;
  const setModalBody = globals.setModalBody;
  const setShowModal = globals.setShowModal;
  const [stickie, setStickie] = useState('Tabled');
  const [ID, setID] = useState('');
  const { controlledLog } = useControlledLog();

  function sendStickie() {
    const words = stickie.split(' ');
    const status = words[0];
    const nid = parseInt(ID);
    if (!checkValidNID(nid)) {
      setModalTitle('ERROR');
      setModalBody('Please choose a valid paper id.');
      setShowModal(true);
      return;
    }
    controlledLog('Send stickie ' + status + ' to paper with id: ' + nid);
    const data = { status, nid };
    socketEmit('user_set_stickie', data);
    // now stickie confirmation sent from server
    // flash("Stickie sent for " + nid + " with " + status + ".", "success", "stickie")
  }

  return (
    <Container>
      <Stack direction="horizontal" className="grid-control-bar">
        <div className="font-size-3">
          Bar:&nbsp;{guiBar}
          &nbsp; Above:&nbsp;{gridNidsAbove}
          &nbsp; Below:&nbsp;{gridNidsBelow}
          &nbsp; Conf:&nbsp;{papersConflicted}
          &nbsp; Total:&nbsp;{papersTotal}
        </div>
        <DropdownButton
          title={gridDisplay}
          variant="secondary"
          className="grid-display-dropdown"
        >
          {['Normal', 'Stickie', 'Favorites'].map((gridDisplay, index) => {
            return (
              <Dropdown.Item
                key={index}
                as="button"
                onClick={() => setGridDisplay(gridDisplay)}
              >
                {gridDisplay}
              </Dropdown.Item>
            );
          })}
        </DropdownButton>
      </Stack>

      <Grid isAbove gridDisplay={gridDisplay} />
      <hr className="horizontal-divider" />
      <Grid gridDisplay={gridDisplay} />
      <hr className="horizontal-divider" />

      <Stack direction="horizontal">
        <ColorsDisplay />
        <hr className="vertical-divider"></hr>
        <Container className="set-stickie">
          <p className="stickie-step font-size-3">
            Step 1 &mdash; choose a stickie type:
          </p>
          <ChooseStatusDropdown currentStatus={stickie} setValue={setStickie} />
          <p className="stickie-step font-size-3">
            Step 2 &mdash; type the numeric paper ID:
          </p>
          <div>
            <input
              maxLength={4}
              name="id"
              onChange={(event) => {
                setID(event.target.value);
              }}
            />
          </div>
          <p className="stickie-step font-size-3">
            Step 3 &mdash; click to send stickie:
          </p>
          <Button variant="primary" onClick={sendStickie}>
            Send Stickie
          </Button>
        </Container>
      </Stack>
    </Container>
  );
}
