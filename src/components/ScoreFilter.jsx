// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { useModalDialog } from '../contexts/ModalDialogContext';

export default function ScoreFilter({
  checkboxLabel,
  isChecked,
  updateChecked,
  score,
  updateScore,
}) {
  const { revealModalDialog } = useModalDialog();
  const isDisabled = !isChecked;

  function handleValueChange(event) {
    const target = event.target;
    const value = target.value;
    const numeric = value.replace(/[^\d.-]/g, '');
    updateScore(numeric);
  }

  // This is called when user navigates away from score input.
  function handleBlur(label, val) {
    const num = parseFloat(val);
    if (isNaN(num) || num < -9 || num > 9) {
      let msg = `Invalid score value "${val}" replaced with "0" in "${label}" `;
      msg = msg + ' Please use a number between -9 and 9.';
      updateScore('0');
      revealModalDialog({ title: 'Error', message: msg });
    } else {
      // Convert back to string and set box value.
      // Removes unnecessary decimal point or trailing zero.
      const str = num.toString();
      updateScore(str);
    }
  }

  return (
    <Stack className="ScoreFilter" direction="horizontal" gap={2}>
      <Form.Check
        className="score-checkbox"
        label={checkboxLabel}
        type="checkbox"
        checked={isChecked}
        onChange={() => updateChecked(!isChecked)}
      />
      <input
        className="score-box"
        disabled={isDisabled}
        value={score}
        onChange={handleValueChange}
        onBlur={() => handleBlur(checkboxLabel, score)}
      />
    </Stack>
  );
}
