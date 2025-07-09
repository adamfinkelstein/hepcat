// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { useAdmin } from '../contexts/AdminContext';
import NameList from './NameList';

const removeConflicts = (confEmails, users) => {
  return users.filter((user) => !confEmails.includes(user.email));
};

export default function AvailableChair({ conflicts }) {
  const { roomChairs, roomBackups } = useAdmin();
  const confEmails = conflicts.map((user) => user.email);
  const availChairs = removeConflicts(confEmails, roomChairs);
  const availBackups = removeConflicts(confEmails, roomBackups);
  const avail = availChairs.length ? availChairs : availBackups;
  const show = avail.length;
  const conf = { title: 'Available Chairs:', array: avail };

  return (
    <>
      {show ? (
        <NameList conf_arr={conf} />
      ) : (
        <h3 className="text-danger">No Available Chair!</h3>
      )}
    </>
  );
}
