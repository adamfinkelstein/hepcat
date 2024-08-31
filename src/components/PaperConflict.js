import Container from 'react-bootstrap/Container';

export default function PaperConflict({ conflicts, isCurrent }) {
  const noConflictsStr = '(no conflicts)';

  function userToClass(user) {
    let className = 'font-size-4';
    if (user.role_is_admin || user.role_name === 'Backup') {
      className += isCurrent ? ' current-admin-user' : ' admin-user';
    }
    return className;
  }

  function userToName(user, index) {
    let name = user.full_name;
    if (index < conflicts.length - 1) {
      name += ', ';
    }
    return name;
  }

  return (
    <Container className="PaperConflict">
      {conflicts.length === 0 ? (
        <div className="font-size-4">{noConflictsStr}</div>
      ) : (
        <div>
          <span className="q-title font-size-4">Conflicts:&nbsp;</span>
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
