// Copyright (c) 2025-2026 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { Button, Stack, Collapse } from 'react-bootstrap';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useGrid } from '../contexts/GridContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFilterContext } from '../contexts/FilterContext';
import RestoreBackupDropdown from './RestoreBackupDropdown';

export default function DangerousOps() {
  const { user } = useUser();
  const { revealConfirmationBox } = useConfirmationBox();
  const { controlledLog } = useControlledLog();
  const { socketEmit, socketLogout } = useSocketIO();
  const { gridBar } = useGrid();
  const { locBar, setLocBar, gitInfo, showDangerous, setShowDangerous } =
    useAdmin();
  const { allGuiFilterNames, allTextFilterNames } = useFilterContext();
  const showHideText = showDangerous ? 'Hide' : 'Show';
  const numFilters = allGuiFilterNames.length + allTextFilterNames.length;
  // const { fontPref } = useFontInfo();
  const isSuper = user && user.role_name === 'Super';
  const appVersion = process.env.HEPCAT_VERSION;

  function handleSetBarButton() {
    const text =
      'Are you really sure you want to update the bar?' +
      ' This would wipe out any meeting progress before now.';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        controlledLog('confirmed bar update:', locBar);
        socketEmit('admin_set_bar', locBar);
      } else {
        setLocBar(gridBar); // canceled: reset box back to current bar value
        controlledLog('canceled bar update');
      }
    });
  }

  function handleBulkConfirmButton() {
    const text = 'Are you sure you want to bulk confirm in queue?';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        const msg = 'Bulk confirm in queue';
        controlledLog(msg);
        // flash(msg, 'success');
        socketEmit('admin_bulk_confirm');
      } else {
        const msg = 'Bulk action button canceled.';
        controlledLog(msg);
        // flash(msg, 'warning'); // bad UX to flash on cancel
      }
    });
  }

  function handleWipeDBButton(verb) {
    // verb: 'load', 'wipe', 'restore'
    let text = `Are you really, Really, REALLY sure you want to ${verb} the database?`;
    if (numFilters > 2) {
      text +=
        ` You have ${numFilters} saved filters, and they would be forgotten.` +
        ' You may wish to save a copy first.';
    }
    controlledLog(verb + ' DB button pressed.');
    const socketMsg = 'admin_' + verb + '_database';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        controlledLog('confirmed: ' + socketMsg);
        socketEmit(socketMsg);
        socketLogout(true);
      } else {
        controlledLog('canceled: ' + socketMsg);
        // const msg = 'Button canceled.';
        // flash(msg, 'warning'); // bad UX to flash on cancel
      }
    });
  }

  const dangerousDatabaseButtons = {
    load: 'Load Test Database|Load a clean test database.',
    wipe: 'Wipe Database Clean|Remove ALL data from the database!',
    restore: 'Restore Database|Restore the database from the latest backup.',
  };

  return (
    <div className="DangerousOps mt-3">
      {/* <div className={fontPref}> */}
      <Stack direction="horizontal" className="my-2">
        <h2>Dangerous Operations&nbsp;&nbsp;</h2>
        <Button
          variant="secondary"
          onClick={() => setShowDangerous(!showDangerous)}
        >
          {showHideText}
        </Button>
      </Stack>
      <Collapse in={showDangerous}>
        <Stack direction="vertical" gap={3}>
          <Stack direction="horizontal" gap={2}>
            <Button
              variant="danger"
              onClick={handleSetBarButton}
              className="change-bar-btn"
            >
              Change Bar
            </Button>
            <input
              name="bar"
              value={locBar}
              onChange={(e) => setLocBar(e.target.value)}
            />
          </Stack>
          <Stack direction="horizontal" gap={2}>
            <Button variant="danger" onClick={() => handleBulkConfirmButton()}>
              Bulk&nbsp;Confirm&nbsp;Queue
            </Button>
            <div className="button-desc">
              Mark status of all "Ready" papers in PLENARY queue as now
              discussed.
            </div>
          </Stack>
          {isSuper && (
            <>
              {Object.entries(dangerousDatabaseButtons).map(
                ([verb, labelDesc]) => {
                  const [label, desc] = labelDesc.split('|');
                  const labelNoBreaks = label.replace(/ /g, '\u00A0');
                  return (
                    <Stack direction="horizontal" key={verb}>
                      <Button
                        variant="danger"
                        onClick={() => handleWipeDBButton(verb)}
                      >
                        {labelNoBreaks}
                      </Button>
                      &nbsp;&nbsp;{desc}
                    </Stack>
                  );
                }
              )}
              <Stack direction="horizontal">
                <RestoreBackupDropdown />
                &nbsp;&nbsp;Restore the database from a specific backup file.
              </Stack>
            </>
          )}
        </Stack>
      </Collapse>
      <hr />
      <p>
        {appVersion && <>Version {appVersion}: </>}
        {gitInfo && <>{gitInfo}</>}
      </p>
      <p>&nbsp;</p>
    </div>
  );
}
