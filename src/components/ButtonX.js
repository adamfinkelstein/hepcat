import React from 'react';
import Button from 'react-bootstrap/Button';
import CloseButton from 'react-bootstrap/CloseButton';

function ButtonX({ label, handleClick }) {
  return (
    <Button variant="warning" className="current-favorite font-size-3">
      {label} <CloseButton onClick={handleClick} className="font-size-4" />
    </Button>
  );
}

export default ButtonX;
