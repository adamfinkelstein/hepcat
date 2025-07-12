// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

export default function BoxMsg({ msg }) {
  if (!msg) {
    return <></>;
  }
  return <div className="BoxMsg">{msg}</div>;
}
