import { Collapse } from 'react-bootstrap';
import { useState } from 'react';

export default function CollapsibleParagraph({ title, text }) {
  const [open, setOpen] = useState(true);
  const showHideText = open ? 'Hide' : 'Show';

  return (
    <p className="font-size-4">
      <span
        className="collapsible-par-header"
        role="button"
        onClick={() => setOpen(!open)}
      >
        {showHideText} {title}
      </span>
      <Collapse in={open}>
        <span>:&nbsp;{text}</span>
      </Collapse>
    </p>
  );
}
