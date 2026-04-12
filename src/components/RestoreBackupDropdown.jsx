// Copyright (c) 2026 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import { DateTime } from 'luxon';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useSocketIO } from '../contexts/SocketIOContext';
import { useAdmin } from '../contexts/AdminContext';
import { useConfirmationBox } from '../contexts/ConfirmationBoxContext';

function formatBackupLabel(timestamp, kind) {
  const fmt = 'ccc MMM d, h:mm a ZZZZ';
  const dt = DateTime.fromSeconds(timestamp).toLocal().toFormat(fmt);
  return `${dt} (${kind})`;
}

export default function RestoreBackupDropdown() {
  const { socketEmit } = useSocketIO();
  const { backupFiles, requestBackupList } = useAdmin();
  const { revealConfirmationBox } = useConfirmationBox();

  const handleToggle = (isOpen) => {
    if (isOpen) requestBackupList();
  };

  const handleSelect = (filename, label) => {
    const text =
      `Are you really sure you want to restore the database from backup ${label}? ` +
      'Any data in the current database will be permanently lost.' +
      'This will also disconnect all users and restart the server. ' +
      'You will need to log back in.';
    revealConfirmationBox('Please Confirm', text, (confirmed) => {
      if (confirmed) {
        socketEmit('admin_restore_database_from_file', filename);
      }
    });
  };

  const reversedFiles = backupFiles ? [...backupFiles].reverse() : null;

  return (
    <DropdownButton
      title="Restore DB from File"
      variant="danger"
      onToggle={handleToggle}
    >
      {reversedFiles === null ? (
        <Dropdown.Item disabled>Loading...</Dropdown.Item>
      ) : reversedFiles.length === 0 ? (
        <Dropdown.Item disabled>No backups found.</Dropdown.Item>
      ) : (
        reversedFiles.map(([filename, timestamp, kind]) => {
          const label = formatBackupLabel(timestamp, kind);
          return (
            <Dropdown.Item
              key={filename}
              as="button"
              onClick={() => handleSelect(filename, label)}
            >
              {label}
            </Dropdown.Item>
          );
        })
      )}
    </DropdownButton>
  );
}
