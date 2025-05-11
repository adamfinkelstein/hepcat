import React from 'react';
import { Button, Stack, Collapse } from 'react-bootstrap';
import { useUser } from '../contexts/UserContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useFilterContext } from '../contexts/FilterContext';

export default function DangerousOps() {
  const { user, showGlobalOps, setShowGlobalOps } = useUser();
  const showHideText = showGlobalOps ? 'Hide' : 'Show';
  const { revealConfirmationBox } = useConfirmationBox();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { socketEmit, socketLogout } = useSocketIO();
  const { gitInfo } = useUser();
  const { appBar, guiBar, setGuiBar } = useAppGlobals();
  const { allGuiFilterNames, allTextFilterNames } = useFilterContext();
  const numFilters = allGuiFilterNames.length + allTextFilterNames.length;
  // const { fontPref } = useFontInfo();
  const isSuper = user && user.role_name === 'Super';
  const appVersion = process.env.REACT_APP_VERSION;

  function handleSetBarButton() {
    const text =
      'Are you really sure you want to update the bar?' +
      ' This would wipe out any meeting progress before now.';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        controlledLog('confirmed bar update:', guiBar);
        socketEmit('admin_set_bar', guiBar);
      } else {
        setGuiBar(appBar); // reset box back to current bar value
        controlledLog('canceled bar update');
      }
    });
  }

  function handleBulkActionButton(isQueueNotBar) {
    controlledLog('Bulk reject button pressed (' + isQueueNotBar + ').');
    const endText = isQueueNotBar ? 'confirm in queue' : 'reject below bar';
    const text = 'Are you sure you want to bulk ' + endText + '?';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        const msg = 'Bulk ' + endText;
        controlledLog(msg);
        flash(msg, 'success');
        const data = { isQueueNotBar };
        socketEmit('admin_bulk_action', data);
      } else {
        const msg = 'Bulk action button canceled.';
        controlledLog(msg);
        // flash(msg, 'warning'); // bad UX to flash on cancel
      }
    });
  }

  function handleWipeDBButton(isLoad) {
    const verb = isLoad ? 'load' : 'wipe';
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

  return (
    <div className="DangerousOps mt-3">
      {/* <div className={fontPref}> */}
      <Stack direction="horizontal" className="my-2">
        <h2>Dangerous Operations&nbsp;&nbsp;</h2>
        <Button
          variant="secondary"
          onClick={() => setShowGlobalOps(!showGlobalOps)}
        >
          {showHideText}
        </Button>
      </Stack>
      <Collapse in={showGlobalOps}>
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
              value={guiBar}
              onChange={(e) => setGuiBar(e.target.value)}
            />
          </Stack>
          <Stack direction="horizontal" gap={2}>
            <Button
              variant="danger"
              onClick={() => handleBulkActionButton(true)}
            >
              Bulk&nbsp;Confirm in&nbsp;Queue
            </Button>
            <div className="button-desc">
              Mark status of all "Ready" papers in PLENARY queue as now
              discussed.
            </div>
          </Stack>
          {isSuper && (
            <>
              <Stack direction="horizontal">
                <Button
                  variant="danger"
                  onClick={() => handleWipeDBButton(true)}
                >
                  Load Test Database
                </Button>
                &nbsp;&nbsp;This loads a clean test database.
              </Stack>
              <Stack direction="horizontal">
                <Button
                  variant="danger"
                  onClick={() => handleWipeDBButton(false)}
                >
                  Wipe Database Clean
                </Button>
                &nbsp;&nbsp;This removes ALL data from the database!
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
