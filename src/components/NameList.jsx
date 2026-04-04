// Copyright (c) 2025 Adam Finkelstein
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
  return (
    <div>
      <h5>{conf_arr.title}</h5>
      <ul>
        {conf_arr.array.map((user, user_ind) => {
          return (
            <li key={user_ind}>
              <span className={userToClass(isAdmin, user)}>
                {user.full_name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
