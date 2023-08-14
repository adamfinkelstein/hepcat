import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Stack from 'react-bootstrap/Stack';
import { useAppGlobals } from '../contexts/AppContext';

export default function ChooseStatusDropdown({ currentStatus, setValue }) {
  const statusList = useAppGlobals()['statusList'];

  return (
    <Dropdown as={ButtonGroup} id="status-dropdown-menu">
      <Button variant="outline">
        <Stack direction="horizontal" className="font-size-3">
          <div className={'rectangle ' + currentStatus} />
          <span>{currentStatus}</span>
        </Stack>
      </Button>
      <Dropdown.Toggle split variant="outline" id="dropdown-split-basic" />

      <Dropdown.Menu>
        {statusList.map((status, index) => {
          return (
            <Dropdown.Item
              as="button"
              key={index}
              onClick={() => setValue(status)}
            >
              <Stack direction="horizontal">
                <div className={'rectangle ' + status} />
                <span className="font-size-4">{status}</span>
              </Stack>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}
