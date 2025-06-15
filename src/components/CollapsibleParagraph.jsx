// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Form from 'react-bootstrap/Form';
import { usePreferences } from '../contexts/PreferencesContext';

export default function CollapsibleParagraph({ title, text }) {
  const { showAbstract, setShowAbstract } = usePreferences();
  const checkLabel = 'Show ' + title;
  const content = showAbstract ? text : '';
  return (
    <div className="CollapsibleParagraph">
      <Form.Check
        className="paper-par-header"
        label={checkLabel}
        type="checkbox"
        checked={showAbstract}
        onChange={() => {
          setShowAbstract(!showAbstract);
        }}
      />
      <span>{content}</span>
    </div>
  );
}
