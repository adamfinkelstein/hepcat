import { Button, Stack, Collapse } from 'react-bootstrap';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useGrid } from '../contexts/GridContext';
import { useUser } from '../contexts/UserContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFilterContext } from '../contexts/FilterContext';

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
