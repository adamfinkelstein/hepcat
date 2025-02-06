import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useGrid } from '../contexts/GridContext';

export default function GridModeDropdown() {
  const { gridMode, setGridMode } = useGrid();
  const gridModes = ['Normal', 'Stickies', 'Favorites', 'This Room'];
  const isThisRoom = gridMode === 'This Room';
  const buttonVariant = isThisRoom ? 'warning' : 'secondary';

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
