// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { Container } from 'react-bootstrap';
import HideQueue from './HideQueue';
import GuiFilters from './GuiFilters';
import TextFilters from './TextFilters';

export default function SetQueueTab() {
  return (
    <Container fluid className="SetQueueTab">
      <HideQueue />
      <hr className="horizontal-divider" />
      <GuiFilters />
      <hr className="horizontal-divider" />
      <TextFilters />
    </Container>
  );
}
