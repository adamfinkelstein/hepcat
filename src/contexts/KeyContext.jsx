import React, { useState, useCallback } from 'react';
import CryptoJS from 'crypto-js';

const keyContext = React.createContext();

function decryptMsgUsingKey(msg, keyStr) {
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const decrypted = CryptoJS.AES.decrypt(msg, key, { mode: CryptoJS.mode.ECB });
  const utf8 = decrypted.toString(CryptoJS.enc.Utf8);
  // console.log('\n\nencrypted message: ' + msg)
  // console.log('decrypted message: ' + utf8)
  return utf8;
}

export default function KeyContext({ children }) {
  const [paperKeys, setPaperKeys] = useState(null);

  const oidIsConflict = useCallback(
    (oid) => {
      if (!paperKeys) return true;
      return !(oid in paperKeys);
    },
    [paperKeys]
  );

  const oidToNid = useCallback(
    (oid) => {
      if (oidIsConflict(oid)) return 0;
      return paperKeys[oid].nid;
    },
    [paperKeys, oidIsConflict]
  );

  const decryptMessageByOid = useCallback(
    (msg, oid) => {
      if (oidIsConflict(oid)) return '';
      const key = paperKeys[oid].key;
      return decryptMsgUsingKey(msg, key);
    },
    [paperKeys, oidIsConflict]
  );

  const decryptObjectOrNull = useCallback(
    (obj) => {
      if (!obj || !obj.oid || oidIsConflict(obj.oid)) return null;
      const str = decryptMessageByOid(obj.enc, obj.oid);
      // controlledLog("======= decrypted json: " + str)
      if (!str) return null;
      return JSON.parse(str);
    },
    [oidIsConflict, decryptMessageByOid]
  );

  return (
    <keyContext.Provider
      value={{ paperKeys, setPaperKeys, oidToNid, decryptObjectOrNull }}
    >
      {children}
    </keyContext.Provider>
  );
}

export function useKey() {
  return React.useContext(keyContext);
}
