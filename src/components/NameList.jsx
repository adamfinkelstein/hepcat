// Copyright (c) 2025-2026 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.
import { useUser } from '../contexts/UserContext';

function userToClass(isAdmin, user) {
  const adminClass = isAdmin ? ' admin-user' : '';
  let className = ''; //'bigger-font';
  if (user.role_is_admin || user.role_name === 'Backup') {
    className += adminClass;
  }
  if (user.otherRoom) {
    className += ' other-room';
  } else {
    className += ' bold-user';
  }
  return className;
}

export default function NameList({ conf_arr }) {
  const { isAdmin } = useUser();
  const userList = conf_arr.array;
  const isEmpty = !userList.length;
  return (
    <div>
      <h5>{conf_arr.title}</h5>
      {isEmpty ? (
        <p>(none)</p>
      ) : (
        <ul>
          {userList.map((user, user_ind) => {
            const userName = user.full_name.replaceAll(' ', '\u00A0');
            const userClass = userToClass(isAdmin, user);
            return (
              <li key={user_ind}>
                <span className={userClass}>{userName}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
