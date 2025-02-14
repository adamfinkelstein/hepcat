import Form from 'react-bootstrap/Form';
import { useUser } from '../contexts/UserContext';

export default function CollapsibleParagraph({ title, text }) {
  const { showAbstract, setShowAbstract } = useUser();
  const checkLabel = 'Show ' + title;
  const content = showAbstract ? text : '';
  return (
    <div className="CollapsibleParagraph">
      <Form.Check
        className="paper-par-header"
        label={checkLabel}
        type="checkbox"
        checked={showAbstract}
        onChange={() => {
          setShowAbstract(!showAbstract);
        }}
      />
      <span>{content}</span>
    </div>
  );
}
