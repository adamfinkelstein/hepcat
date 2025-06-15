// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import ColorLabel from './ColorLabel';

export default function ChooseStatusDropdown({
  choiceList,
  currentChoice,
  setValue,
}) {
  return (
    <Dropdown as={ButtonGroup} className="ChooseStatusDropdown">
      <Dropdown.Toggle variant="outline">
        <ColorLabel
          rectClass={currentChoice}
          label={currentChoice}
          extra={'PULLDOWN'}
        />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {choiceList.map((status) => {
          return (
            <Dropdown.Item
              as="button"
              key={status}
              onClick={() => setValue(status)}
            >
              <ColorLabel rectClass={status} label={status} />
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}
