// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Split from 'react-split';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
export default function Body() {
  const { user } = useUser();
  const { splitWidth, setSplitWidth } = usePreferences();

  const handleDragEnd = (sizes) => setSplitWidth(sizes);

  return (
    <Container fluid className="Body">
      {!user ? (
        <p>Waiting for server connection...</p>
      ) : (
        <Split
          direction="horizontal"
          className="split"
          sizes={[splitWidth[0], splitWidth[1]]}
          cursor="col-resize"
          minSize={[300, 500]}
          onDragEnd={handleDragEnd}
        >
          <LeftPanel />
          <RightPanel />
        </Split>
      )}
    </Container>
  );
}
