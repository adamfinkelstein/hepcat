import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ChooseStatusDropdown from './ChooseStatusDropdown.js';
import StickyTip from './StickyTip.js';
import { useState } from 'react';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useControlledLog } from '../contexts/ControlledLogContext.js';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useAppGlobals } from '../contexts/AppContext';

export default function SetSticky() {
  const { socketEmit } = useSocketIO();
  const { revealModalDialog } = useModalDialog();
  const { revealConfirmationBox } = useConfirmationBox();
  const { grid, statusList, checkValidNID } = useAppGlobals();
  const [stickyType, setStickyType] = useState('Tabled');
  const [ID, setID] = useState('');
  const { controlledLog } = useControlledLog();

  const paperHasSticky = (nid) => {
    // note already called checkValidNID(nid).
    // so we know there is a valid grid element.
    const gridElem = grid.papers[nid];
    return Boolean(gridElem.sticky);
  };

  const paperGridStatus = (nid) => {
    // note already called checkValidNID(nid).
    // so we know there is a valid grid element.
    const gridElem = grid.papers[nid];
    return '' + gridElem.status; // force string
  };

  const sendStickyForNID = (nid, status) => {
    const data = { status, nid };
    controlledLog('Send sticky ' + status + ' for paper: ' + nid);
    socketEmit('user_set_sticky', data);
  };

  /*
* Unseen
    - Tabled - ok
    - CJR - confirm (because it was presumably converged already on BBS)
* Tabled
    - Tabled - already!
    - CJ - ok
    - R - above -ok, below warn
* Tabled-Sticky
    - Tabled - already!
    -  CJR - If was tabled, ok; otherwise weird
* CJR: converged in meeting
    - Tabled - ok
    - CJR - weird
*/

  const checkStickyOnUnseenPaper = (nid, status) => {
    if (status === 'Tabled') {
      sendStickyForNID(nid, status);
      return;
    }
    let text = `It looks like paper ${nid} already converged on the BBS.`;
    text += ` Are you sure you want to send a sticky with a possibly new status (${status})?`;
    revealConfirmationBox('Superfluous Sticky?', text, (confirmed) => {
      if (confirmed) {
        sendStickyForNID(nid, status);
      } else {
        controlledLog('Canceled sticky for paper: ' + nid);
      }
    });
  };

  const warnAboutRejectStickyBelowBar = (nid, status) => {
    return;
  };

  const checkStickyOnTabledPaper = (nid, status) => {
    if (status === 'Tabled') {
      const text = `Paper ${nid} is already Tabled.`;
      revealModalDialog({
        title: 'Duplicate Sticky Error',
        message: text,
      });
      return;
    }
  };

  const confirmStatusOkAndSendSticky = (nid, status) => {
    const currentStatus = paperGridStatus(nid);
    const text = `Sticky status ${status} nid ${nid} current status ${currentStatus}`;
    revealModalDialog({
      title: 'Warning',
      message: text,
    });
    sendStickyForNID(nid, status);
  };

  const confirmNIDandSendSticky = () => {
    const nid = parseInt(ID);
    const status = '' + stickyType; // convert to string
    // first check to see if nid is valid (not a conflict)
    if (!checkValidNID(nid)) {
      revealModalDialog({
        title: 'Error',
        message: 'Please choose a valid paper id.',
      });
      return;
    }
    // next check to see if nid already has a sticky
    if (paperHasSticky(nid)) {
      let text = 'Paper ' + nid + ' already has a sticky. ';
      text += 'Are you sure you want to overwrite it?';
      revealConfirmationBox('Duplicate Sticky?', text, (confirmed) => {
        if (confirmed) {
          confirmStatusOkAndSendSticky(nid, status);
        } else {
          controlledLog('Canceled duplicate sticky for paper: ' + nid);
        }
      });
      return;
    }
    // nid is valid and has no current sticky so just send it along
    confirmStatusOkAndSendSticky(nid, status);
  };

  return (
    <Stack direction="vertical" gap={1} className="SetSticky">
      <Stack direction="horizontal" gap={3}>
        <div className="underline bigger-font">Send Sticky</div>
        <StickyTip />
      </Stack>
      <Stack direction="horizontal" gap={2}>
        <div className="mt-1">Step 1 &mdash; choose a sticky type:</div>
        <div />
      </Stack>
      <Stack direction="horizontal">
        <ChooseStatusDropdown
          choiceList={statusList}
          currentChoice={stickyType}
          setValue={setStickyType}
          renameTabledEntry="Tabled-Sticky"
        />
        <div />
      </Stack>
      <div className="mt-2">Step 2 &mdash; type the numeric paper ID:</div>
      <div>
        <input
          maxLength={4}
          name="id"
          onChange={(event) => {
            setID(event.target.value);
          }}
        />
      </div>
      <div className="mt-2">Step 3 &mdash; click to send sticky:</div>
      <Stack direction="horizontal">
        <Button variant="primary" onClick={confirmNIDandSendSticky}>
          Send Sticky
        </Button>
        <div />
      </Stack>
    </Stack>
  );
}
