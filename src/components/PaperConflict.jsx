// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Container from 'react-bootstrap/Container';

export default function PaperConflict({ conflicts, isCurrent }) {
  const noConflictsStr = '(no conflicts)';

  function userToClass(user) {
    if (user.role_is_admin || user.role_name === 'Backup') {
      // if current queue entry (black background) choose a different blue foreground
      return isCurrent ? 'current-admin-user' : 'admin-user';
    }
    return '';
  }

  function userToName(user, index) {
    let name = user.full_name;
    if (index < conflicts.length - 1) {
      name += ', ';
    }
    return name;
  }

  return (
    <Container fluid className="PaperConflict">
      {conflicts.length === 0 ? (
        <div>{noConflictsStr}</div>
      ) : (
        <div>
          <span className="q-title">Conflicts:&nbsp;</span>
          {conflicts.map((conflict, index) => {
            return (
              <span key={index} className={userToClass(conflict)}>
                {userToName(conflict, index)}
              </span>
            );
          })}
        </div>
      )}
    </Container>
  );
}
