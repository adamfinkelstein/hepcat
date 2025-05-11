import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
// import Stack from 'react-bootstrap/Stack';
import { useControlledLog } from '../contexts/ControlledLogContext';
import { useFlasher } from '../contexts/FlasherContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';
import { useSticky } from '../contexts/StickyContext';

export default function RevokeStickies() {
  const { controlledLog } = useControlledLog();
  const { stickyKeys, revokeSticky } = useSticky();
  const { flash } = useFlasher();
  const { revealConfirmationBox } = useConfirmationBox();
  const stickyNids = Object.keys(stickyKeys);
  const showRevoke = stickyNids.length > 0;

  const sendRevokeSticky = (nid) => {
    const ok = revokeSticky(nid);
    if (!ok) {
      const msg = 'Too late to revoke sticky for paper ' + nid;
      controlledLog(msg);
      flash(msg, 'warning');
    }
  };

  const handleStickyButton = (nid) => {
    let text = 'Revoke sticky for paper ' + nid + ' -- are you sure?';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        sendRevokeSticky(nid);
        const msg = 'Send request to revoke sticky for paper ' + nid;
        controlledLog(msg);
      } else {
        const msg = 'Revoke sticky canceled.';
        controlledLog(msg);
      }
    });
  };

  return (
    <Container fluid className="RevokeStickies">
      <h2>Revoke Stickies</h2>
      {showRevoke ? (
        <Container fluid className="mt-3 mb-5">
          {stickyNids.map((nid) => {
            return (
              <Button
                key={nid}
                className="mx-2"
                variant="warning"
                onClick={() => handleStickyButton(nid)}
              >
                {nid}
              </Button>
            );
          })}
        </Container>
      ) : (
        <span className="mt-5 ms-3">(No current stickies to revoke.)</span>
      )}
    </Container>
  );
}
