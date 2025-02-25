// import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';

export default function CheckGroup({
  checkLabels,
  alreadyCheckedList,
  checkLabelToId,
  handleCheckClick,
  header = '',
}) {
  return (
    <Form.Group className="mb-4">
      {header && <Form.Label className="mb-1">{header}</Form.Label>}
      {checkLabels.map((label) => {
        const checked = alreadyCheckedList.includes(label);
        const id = checkLabelToId(label);
        return (
          <Form.Check
            key={id}
            id={id}
            label={label}
            type="checkbox"
            checked={checked}
            onChange={() => handleCheckClick(label, !checked)}
          />
        );
      })}
    </Form.Group>
  );
}
