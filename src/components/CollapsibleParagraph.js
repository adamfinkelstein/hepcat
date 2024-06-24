import { Collapse } from 'react-bootstrap';
import { useUser } from '../contexts/UserContext';

export default function CollapsibleParagraph({ title, text }) {
  const { showAbstract, setShowAbstract } = useUser();
  const showHideText = showAbstract ? 'Hide' : 'Show';

  return (
    <p className="font-size-4">
      <span
        className="collapsible-par-header"
        role="button"
        onClick={() => {
          console.log('click on was: ' + showAbstract);
          setShowAbstract(!showAbstract);
        }}
      >
        {showHideText} {title}
      </span>
      <Collapse in={showAbstract}>
        <span>:&nbsp;{text}</span>
      </Collapse>
    </p>
  );
}
