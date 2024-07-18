import React from 'react';
import { Button, Stack, Container, Collapse } from 'react-bootstrap';
import { useUser } from '../contexts/UserContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useAppGlobals } from '../contexts/AppContext';
import { useStatsContext } from '../contexts/StatsContext';
import Stats from '../components/Stats';

export default function ProgressPage() {
  const { conflictbot, showGlobalOps, setShowGlobalOps } = useUser();
  const showHideText = showGlobalOps ? 'Hide' : 'Show';
  const { revealConfirmationBox } = useConfirmationBox();
  const { controlledLog } = useControlledLog();
  const { flash } = useFlasher();
  const { socketEmit } = useSocketIO();
  const { roomChoice } = useUser();
  const { guiBar, setGuiBar } = useAppGlobals();
  const { stats } = useStatsContext();
  const guiBarString = guiBar + '';
  const statsHeader = stats ? stats.header : [];
  const statsRows = stats ? stats.rows : [];
  const statsWhen = stats ? stats.when : '';

  function handleRequestStats() {
    socketEmit('admin_get_stats');
    const msg = 'Sent request update stats.';
    controlledLog(msg);
    flash(msg, 'success');
  }

  function handleRefreshConflictbot(inAllRooms) {
    if (!conflictbot) return;
    // This function is only used in online meetings.
    // Could replace window.confirm with revealConfirmationBox()
    // as elsewhere in this file, but the logic is a bit twisted.
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
        flash(msg, 'warning');
      }
    });
  }

  function handleClearStickiesButton() {
    controlledLog('Clear stickies button pressed.');
    let text = 'Are you sure you want to clear all stickies?';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        const msg = 'Clearing stickies.';
        controlledLog(msg);
        flash(msg, 'success');
        socketEmit('admin_clear_stickies');
      } else {
        const msg = 'Canceled clearing stickies.';
        controlledLog(msg);
        flash(msg, 'warning');
      }
    });
  }

  return (
    <Container>
      <Stack direction="horizontal" className="space-down-from-bar">
        <span className="font-size-1">Progress Page</span>
      </Stack>
      <hr className="horizontal-divider" />
      <Stack direction="horizontal">
        <h2>Stats&nbsp;&nbsp;</h2>
        <Button variant="primary" onClick={handleRequestStats}>
          Refresh
        </Button>
        {<div>&nbsp;&nbsp;{statsWhen}</div>}
      </Stack>
      {stats ? (
        <Stats header={statsHeader} rows={statsRows} />
      ) : (
        <div>Click "Refresh" button above to get stats.</div>
      )}
      <hr className="horizontal-divider" />
      <Stack direction="horizontal">
        <h2>Global Operations (use with care)&nbsp;&nbsp;</h2>
        <Button
          variant="secondary"
          onClick={() => setShowGlobalOps(!showGlobalOps)}
        >
          {showHideText}
        </Button>
      </Stack>
      <Collapse in={showGlobalOps}>
        <Stack>
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
              variant="danger"
              onClick={handleSetBarButton}
              className="change-bar-btn"
            >
              Change Bar
            </Button>
            <input
              name="bar"
              value={guiBarString}
              onChange={(e) => setGuiBar(e.target.value)}
            />
          </Stack>
          <hr className="horizontal-divider" />
          <Stack direction="horizontal">
            <Button variant="danger" onClick={handleClearStickiesButton}>
              Clear Stickies
            </Button>
            <div class="button-desc">Clear all stickies.</div>
          </Stack>
          <hr className="horizontal-divider" />
          <Stack direction="horizontal">
            <Button
              variant="danger"
              onClick={() => handleBulkActionButton(false)}
            >
              Bulk&nbsp;Reject Below&nbsp;Bar
            </Button>
            <div class="button-desc">
              Mark status of all unseen reject papers below bar as now
              discussed.
            </div>
          </Stack>
          <hr className="horizontal-divider" />
          <Stack direction="horizontal">
            <Button
              variant="danger"
              onClick={() => handleBulkActionButton(true)}
            >
              Bulk&nbsp;Confirm in&nbsp;Queue
            </Button>
            <div class="button-desc">
              Mark status of all unseen papers in PLENARY queue as now
              discussed.
            </div>
          </Stack>
        </Stack>
      </Collapse>
      <hr className="horizontal-divider" />
    </Container>
  );
}
