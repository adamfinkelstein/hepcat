import Stack from 'react-bootstrap/Stack';
import ProgressBar from 'react-bootstrap/ProgressBar';
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
  const gridCountAbove = grid?.above_oids ? grid.above_oids.length : 0;
  const gridCountBelow = grid?.below_oids ? grid.below_oids.length : 0;
  const gridNidsAbove = grid?.above_nids ? grid.above_nids.length : 0;
  const gridNidsBelow = grid?.below_nids ? grid.below_nids.length : 0;
  const pTotal = gridCountAbove + gridCountBelow;
  const pUnconflicted = gridNidsAbove + gridNidsBelow;
  const pConflicted = pTotal - pUnconflicted;
  const checkValidNID = globals.checkValidNID;
  const [sticky, setSticky] = useState('Tabled');
  const [ID, setID] = useState('');
  const { controlledLog } = useControlledLog();

  const getCount = (status) => {
    if (!pUnconflicted || !grid?.counts || !grid.counts.hasOwnProperty(status))
      return 0;
    const count = grid.counts[status];
    return count;
  };

  const getPercent = (status) => {
    const count = getCount(status);
    const percent = (count / pUnconflicted) * 100;
    return percent;
  };

  const showPercent = (status) => {
    const percent = getPercent(status);
    const intPercent = Math.round(percent);
    return intPercent + '%';
  };

  const getCounts = (status) => {
    const count = getCount(status);
    const percent = showPercent(status);
    const fmt = `${percent} (${count})`;
    return fmt;
  };

  const sendSticky = () => {
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
  };

  const gridModes = ['Normal', 'Stickies', 'Favorites'];
  const progressBars = ['Journal', 'Conference', 'Reject', 'Tabled'];
  const unseenPercent = getPercent('Unseen');
  const showUnseenPercent = unseenPercent > 5 ? showPercent('Unseen') : '';

  return (
    <Stack direction="vertical" gap={3} className="GridSection ms-2">
      <Stack direction="horizontal" className="grid-control-bar" gap={3}>
        <div className="font-size-4">
          Bar:&nbsp;{guiBar}
          &nbsp; Above:&nbsp;{gridNidsAbove}
          &nbsp; Below:&nbsp;{gridNidsBelow}
          &nbsp; Conflicts:&nbsp;{pConflicted}
          &nbsp; Total:&nbsp;{pTotal}
        </div>
        <DropdownButton
          title={gridDisplay}
          variant="secondary"
          className="grid-display-dropdown me-3"
        >
          {gridModes.map((gridDisplay) => {
            return (
              <Dropdown.Item
                key={gridDisplay}
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

      {pUnconflicted > 0 && (
        <Stack direction="vertical" className="my-0" gap={1}>
          <hr className="horizontal-divider" />
          <ProgressBar className="grid-item Unseen grid-progress-unseen me-3">
            {progressBars.map((status) => {
              const className = 'font-size-4 grid-item ' + status;
              const percent = getPercent(status);
              const intPercent = showPercent(status);
              const textPercent = percent > 5 ? intPercent : '';
              return (
                <ProgressBar
                  key={status}
                  now={percent}
                  label={textPercent}
                  className={className}
                />
              );
            })}
            {showUnseenPercent && (
              <span className="font-size-4 grid-item mx-auto">
                {showUnseenPercent}
              </span>
            )}
          </ProgressBar>

          <Stack
            direction="horizontal"
            className="font-size-4 my-0 me-3"
            gap={3}
          >
            <div>Converged: {getCounts('Converged')}</div>
            <div>+</div>
            <div>Tabled: {getCounts('Tabled')}</div>
            <div>+</div>
            <div>Unseen: {getCounts('Unseen')}</div>
            <div>=</div>
            <div className="unconflicted-count">
              Unconflicted: {pUnconflicted}
            </div>
          </Stack>
          <hr className="horizontal-divider" />
        </Stack>
      )}
      <Stack direction="horizontal" gap={4} className="below-grid">
        <ColorsDisplay gridCounts={grid?.counts} />
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
