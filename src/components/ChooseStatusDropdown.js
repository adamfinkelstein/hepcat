import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import ColorLabel from './ColorLabel';

function remapStatus(status, renameTabledEntry) {
  if (status === 'Tabled' && renameTabledEntry) {
    return renameTabledEntry;
  }
  return status;
}

export default function ChooseStatusDropdown({
  choiceList,
  currentChoice,
  setValue,
  renameTabledEntry = null,
}) {
  const renameCurrent = remapStatus(currentChoice, renameTabledEntry);
  return (
    <Dropdown as={ButtonGroup} className="ChooseStatusDropdown">
      <Dropdown.Toggle variant="outline">
        <ColorLabel
          rectClass={renameCurrent}
          label={renameCurrent}
          extra={'PULLDOWN'}
        />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {choiceList.map((status) => {
          const renameStatus = remapStatus(status, renameTabledEntry);
          return (
            <Dropdown.Item
              as="button"
              key={status}
              onClick={() => setValue(status)}
            >
              <ColorLabel rectClass={renameStatus} label={renameStatus} />
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}
