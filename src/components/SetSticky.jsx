import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ChooseStatusDropdown from './ChooseStatusDropdown';
import StickyTip from './StickyTip';
import { useState } from 'react';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useModalDialog } from '../contexts/ModalDialogContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useGrid } from '../contexts/GridContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSticky } from '../contexts/StickyContext';

export default function SetSticky() {
  const { revealModalDialog } = useModalDialog();
  const { revealConfirmationBox } = useConfirmationBox();
  const { gridGetElemByNid, gridNidIsValid } = useGrid();
  const [stickyType, setStickyType] = useState('Tabled-Discuss');
  const [ID, setID] = useState('');
  const { controlledLog } = useControlledLog();
  const { favorites } = usePreferences();
  const { sendSticky } = useSticky();

  const stickyOptions = ['Tabled-Discuss', 'Reject', 'Conference', 'Journal'];
  const stickyStatuses = ['Ready', 'Tabled-Discuss'];
  const doneStatuses = ['Journal', 'Conference', 'Reject'];
  const acceptStatuses = ['Journal', 'Conference'];

  const statusIsSticky = (status) => {
    return stickyStatuses.includes(status);
  };

  const statusIsDone = (status) => {
    return doneStatuses.includes(status);
  };

  const statusIsAccept = (status) => {
    return acceptStatuses.includes(status);
  };

  const paperIsBelowBar = (gridElem) => {
    return Boolean(gridElem.below_bar);
  };

  const confirmWarningsThenSendSticky = (warnings, nid) => {
    let text = '';
    if (warnings.length === 1) {
      text = warnings[0];
    } else {
      text += 'markdown:\n';
      text += 'There are several potential issues with this sticky:\n';
      for (let i = 0; i < warnings.length; i++) {
        text += `${i + 1}. ${warnings[i]}\n`;
      }
    }
    text += '\nContinue with this sticky anyway?';
    revealConfirmationBox('Confirm Sticky?', text, (confirmed) => {
      if (confirmed) {
        sendSticky(nid, stickyType);
      } else {
        controlledLog('Canceled sticky for paper: ' + nid);
      }
    });
  };

  /* We already know nid is valid, so we can skip that check.
   * These warnings should be consistent with the policy in
   * current_app.config["HEPCAT_AUTO_REJECT"]
   */
  const checkForWarningsThenSendSticky = (nid) => {
    const gridElem = gridGetElemByNid(nid);
    const gridStatus = gridElem.status;
    const warnings = [];
    if (statusIsSticky(gridStatus)) {
      let text = `Paper ${nid} already has a sticky. `;
      text += 'This sticky would overwrite/replace it.';
      warnings.push(text);
    }
    if (paperIsBelowBar(gridElem) && stickyType === 'Reject') {
      let text = `Paper ${nid} is below the bar. `;
      if (statusIsAccept(gridStatus)) {
        text += 'Since it had previously converged to Accept, it must now ';
        text += 'be discussed in the meeting as a proposed Reject.';
      } else {
        text += 'This Reject sticky will give it status "presumed reject" -- ';
        text += 'meaning it may never come up for discussion in the meeting. ';
      }
      warnings.push(text);
    } else if (statusIsDone(gridStatus)) {
      let text = `Paper ${nid} already converged in the meeting (to ${gridStatus}). `;
      text += `This sticky (${stickyType}) would cause the paper to be re-discussed. `;
      warnings.push(text);
    }
    if (favorites?.length && !favorites.includes(nid)) {
      let text = 'You have marked one or more favorites, ';
      text += `but Paper ${nid} is not among them. `;
      text += 'Usually stickies are filed for papers you are tracking. ';
      warnings.push(text);
    }
    // now confirm warnings (if any) and send sticky...
    if (warnings.length) {
      confirmWarningsThenSendSticky(warnings, nid);
    } else {
      sendSticky(nid, stickyType);
    }
  };

  const confirmNIDandSendSticky = () => {
    const nid = parseInt(ID);

    if (gridNidIsValid(nid)) {
      checkForWarningsThenSendSticky(nid);
    } else {
      revealModalDialog({
        title: 'Sticky Failure',
        message: ID + ' is not a valid paper id (or possibly a conflict).',
      });
    }
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
          choiceList={stickyOptions}
          currentChoice={stickyType}
          setValue={setStickyType}
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
