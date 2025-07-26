// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

function userToClass(user) {
  let className = ''; //'bigger-font';
  if (user.role_is_admin || user.role_name === 'Backup') {
    className += ' admin-user';
  }
  if (user.otherRoom) {
    className += ' other-room';
  } else {
    className += ' bold-user';
  }
  return className;
}

export default function NameList({ conf_arr }) {
  return (
    <div>
      <h5>{conf_arr.title}</h5>
      <ul>
        {conf_arr.array.map((user, user_ind) => {
          return (
            <li key={user_ind}>
              <span className={userToClass(user)}>{user.full_name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
