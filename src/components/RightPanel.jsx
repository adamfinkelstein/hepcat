// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { useQueue } from '../contexts/QueueContext';
import { useUser } from '../contexts/UserContext';
import { usePreferences } from '../contexts/PreferencesContext';
import PaperTab from './PaperTab';
import GridTab from './GridTab';
import SetQueueTab from './SetQueueTab';

export default function RightPanel() {
  const { isAdmin, isScreenOrOutside } = useUser();
  const { roomGlobs } = useQueue();
  const { fontPref } = usePreferences();
  const showGrid = !isScreenOrOutside();
  const hideQueue = !isAdmin && roomGlobs?.hide_queue;

  return (
    <Container fluid className="RightPanel">
      <div className={fontPref}>
        <Tabs defaultActiveKey="paper" className="mb-3 bigger-font tabs">
          {!hideQueue && (
            <Tab eventKey="paper" title="Paper" className="tab">
              <PaperTab />
            </Tab>
          )}
          {showGrid && (
            <Tab eventKey="grid" title="Grid" className="tab">
              <GridTab />
            </Tab>
          )}
          {isAdmin && (
            <Tab eventKey="queue" title="Set Queue" className="tab">
              <SetQueueTab />
            </Tab>
          )}
        </Tabs>
      </div>
    </Container>
  );
}
