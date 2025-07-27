// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';

export default function QueueConflicts({ conflicts }) {
  // note: isCurrent was passed in props but now ignored
  const noConflictsStr = '(no conflicts)';

  function userToName(user, index) {
    let name = user.full_name;
    if (index < conflicts.length - 1) {
      name += ', ';
    }
    return name;
  }

  return (
    <Container fluid className="QueueConflicts">
      {conflicts.length === 0 ? (
        <div>{noConflictsStr}</div>
      ) : (
        <div>
          <span className="q-title">Conflicts:&nbsp;</span>
          {conflicts.map((conflict, index) => {
            return <span key={index}>{userToName(conflict, index)}</span>;
          })}
        </div>
      )}
    </Container>
  );
}
