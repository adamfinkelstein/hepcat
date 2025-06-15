// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
// import DropdownButton from 'react-bootstrap/DropdownButton';
import Stack from 'react-bootstrap/Stack';

export default function SaveFilters({
  isGUI,
  inputBoxName,
  filterName,
  allFilterNames,
  handleLoadFilter,
  handleSaveFilter,
  handleDeleteFilter,
  handleInputChange,
}) {
  const noneSavedYet = !allFilterNames.length;
  const filterType = isGUI ? 'GUI' : 'Text';
  let guiFilterTitle = 'Saved ' + filterType + ' Filters';
  if (noneSavedYet) {
    guiFilterTitle = 'No ' + guiFilterTitle + ' Yet';
  }

  return (
    <Stack direction="horizontal" gap={4} className="SaveFilters">
      <Dropdown>
        <Dropdown.Toggle disabled={noneSavedYet}>
          {guiFilterTitle}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {allFilterNames.map((name) => {
            return (
              <Dropdown.Item
                key={name}
                as="button"
                onClick={() => handleLoadFilter(name, isGUI)}
              >
                {name}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
      <input
        name={inputBoxName}
        value={filterName}
        onChange={(e) => handleInputChange(e, isGUI)}
      />
      <Button
        variant="warning"
        onClick={() => handleSaveFilter(isGUI)}
        className="change-bar-btn"
      >
        Save
      </Button>
      <Button
        variant="danger"
        onClick={() => handleDeleteFilter(isGUI)}
        className="change-bar-btn"
      >
        Delete
      </Button>
    </Stack>
  );
}
