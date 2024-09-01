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
import { useModalDialog } from '../contexts/ModalDialogContext';

export default function GridSection() {
  const [gridDisplay, setGridDisplay] = useState('Normal');
  const { socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
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
  const [sticky, setSticky] = useState('Tabled');
  const [ID, setID] = useState('');
  const { controlledLog } = useControlledLog();

  function sendSticky() {
    const words = sticky.split(' ');
    const status = words[0];
    const nid = parseInt(ID);
    if (!checkValidNID(nid)) {
      revealModalDialog({
        title: 'Error',
        message: 'Please choose a valid paper id.',
      });
      return;
    }
    controlledLog('Send sticky ' + status + ' to paper with id: ' + nid);
    const data = { status, nid };
    socketEmit('user_set_sticky', data);
  }

  return (
    <Stack direction="vertical" gap={3} className="GridSection">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div className="font-size-4">
          Bar:&nbsp;{guiBar}
          &nbsp; Above:&nbsp;{gridNidsAbove}
          &nbsp; Below:&nbsp;{gridNidsBelow}
          &nbsp; Conflicts:&nbsp;{papersConflicted}
          &nbsp; Total:&nbsp;{papersTotal}
        </div>
        <DropdownButton
          title={gridDisplay}
          variant="secondary"
          className="grid-display-dropdown"
        >
          {['Normal', 'Stickies', 'Favorites'].map((gridDisplay, index) => {
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

      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorsDisplay />
        <div className="vr" />
        <Stack direction="vertical" gap={2} className="set-sticky">
          <div>
            <span className="col-head font-size-3">File Sticky</span>:
          </div>
          <div className="font-size-4 mt-3">
            Step 1 &mdash; choose a sticky type:
          </div>
          <Stack direction="horizontal">
            <ChooseStatusDropdown currentStatus={sticky} setValue={setSticky} />
            <div />
          </Stack>
          <div className="font-size-4 mt-3">
            Step 2 &mdash; type the numeric paper ID:
          </div>
          <div>
            <input
              maxLength={4}
              name="id"
              onChange={(event) => {
                setID(event.target.value);
              }}
            />
          </div>
          <div className="font-size-4 mt-3">
            Step 3 &mdash; click to send sticky:
          </div>
          <Stack direction="horizontal">
            <Button variant="primary" onClick={sendSticky}>
              Send Sticky
            </Button>
            <div />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
