// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import Stack from 'react-bootstrap/Stack';

export default function RectangleList({ keys }) {
  return (
    <Stack className="ColorLegend" direction="horizontal" gap={1}>
      {keys.map((key) => {
        const fullClass = 'rectangle ' + key;
        return <span key={key} className={fullClass} />;
      })}
    </Stack>
  );
}
