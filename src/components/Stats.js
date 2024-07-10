import React from 'react';
import Table from 'react-bootstrap/Table';

export default function Stats({ header, rows }) {
  return (
    <Table striped bordered hover className="stats-table">
      <thead>
        <tr>
          {header.map((item, index) => (
            <th key={'header-' + index}>{item}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIndex) => (
          <tr key={'row-' + rIndex}>
            {row.map((item, iIndex) => (
              <td key={'item-' + rIndex + '-' + iIndex}>{item}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
