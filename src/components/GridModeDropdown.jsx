// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useGrid } from '../contexts/GridContext';

export default function GridModeDropdown() {
  const { gridMode, setGridMode } = useGrid();
  const gridModes = ['Normal', 'Favorites', 'This Room'];
  const isThisRoom = gridMode === 'This Room';
  const buttonVariant = isThisRoom ? 'info' : 'secondary';

  return (
    <DropdownButton
      title={gridMode}
      variant={buttonVariant}
      className="GridModeDropdown me-3"
    >
      {gridModes.map((gridMode) => {
        return (
          <Dropdown.Item
            key={gridMode}
            as="button"
            onClick={() => setGridMode(gridMode)}
          >
            {gridMode}
          </Dropdown.Item>
        );
      })}
    </DropdownButton>
  );
}
