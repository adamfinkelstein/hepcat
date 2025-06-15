// Copyright (c) 2025 Adam Finkelstein
// Licensed under the Apache 2.0 License. See LICENSE file for details.

import React, { useState, useCallback } from 'react';

/*
 * Helper functions to deal with decrypting messages.
 */

async function keyStringToCryptoKey(keyStr) {
  // Convert key to 16 bytes (padding as at server)
  const pad16 = keyStr.padEnd(16, '\0').slice(0, 16);
  const key16 = new TextEncoder().encode(pad16);

  // Import key to crypto library
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key16,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  return cryptoKey;
}

async function decryptBuffer(iv, cryptoKey, ciphertext) {
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    ciphertext
  );
  return decryptedBuffer;
}

async function decryptMsgUsingKey(msg, key) {
  try {
    // Decode base64 into typed array of bytes
    const data = Uint8Array.from(atob(msg), (c) => c.charCodeAt(0));
    const iv = data.slice(0, 12); // nonce (first 12 bytes)
    const ciphertext = data.slice(12); // the rest
    const cryptoKey = await keyStringToCryptoKey(key);
    const decrypted = await decryptBuffer(iv, cryptoKey, ciphertext);
    const decoded = new TextDecoder().decode(decrypted);
    return decoded;
  } catch (error) {
    console.error('AES-GCM decryption failed:', error);
    return null;
  }
}

/*
 * Helper functions for debugging encrypted message.
 * The server can optionally include a debug string,
 * and if so it will be checked here at the client.
 * The string includes the beginning, end and length
 * of both the decrypted and encrypted content, like:
 * [ {"nid": ...2869...false}]} | eWk2CASE...3864...5xoVFhE= ]
 * Should only be used for debugging the crypto path.
 */

function debugObjString(str) {
  const beg = str.slice(0, 8);
  const end = str.slice(-8);
  const n = str.length;
  const debug = `${beg}...${n}...${end}`;
  return debug;
}

function debugEncoding(jsn, enc) {
  const dJsn = debugObjString(jsn);
  const dEnc = debugObjString(enc);
  const debug = `[ ${dJsn} | ${dEnc} ]`;
  return debug;
}

function debugCheckString(obj, json) {
  const debug = obj.debug;
  if (!debug) return;
  const check = debugEncoding(json, obj.enc);
  if (debug !== check) {
    console.error('debug:', debug);
    console.error('check:', check);
  }
}

/*
 * Key context remembers encryption keys for unconflicted papers.
 * Uses helper functions above to manage decrypting objects.
 * Used for sensitive objects sent from server (encrypted json).
 * Encryption is asynchronous so exported API calls supplied
 * callback functions to return decrypted objects.
 */

const keyContext = React.createContext();

export default function KeyContext({ children }) {
  const [paperKeys, setPaperKeys] = useState(null);

  const oidIsConflict = useCallback(
    (oid) => {
      if (!paperKeys) return true;
      return !(oid in paperKeys);
    },
    [paperKeys]
  );

  const decryptMessageByOid = useCallback(
    async (msg, oid) => {
      if (oidIsConflict(oid)) return null;
      const key = paperKeys[oid].key;
      return await decryptMsgUsingKey(msg, key);
    },
    [paperKeys, oidIsConflict]
  );

  const decryptObjectOrNull = useCallback(
    async (obj) => {
      if (!obj || !obj.oid || oidIsConflict(obj.oid)) return null;
      const json = await decryptMessageByOid(obj.enc, obj.oid);
      if (!json) return null;
      debugCheckString(obj, json);
      return JSON.parse(json);
    },
    [oidIsConflict, decryptMessageByOid]
  );

  const decryptThenHandleObj = useCallback(
    async (obj, callback) => {
      if (!obj?.oid || oidIsConflict(obj.oid)) return;
      const json = await decryptMessageByOid(obj.enc, obj.oid);
      if (!json) return;
      debugCheckString(obj, json);
      const decoded = JSON.parse(json);
      callback(decoded);
    },
    [oidIsConflict, decryptMessageByOid]
  );

  const decryptThenHandleArray = useCallback(
    async (arr, callback) => {
      if (!arr) return;
      const result = await Promise.all(arr.map(decryptObjectOrNull));
      callback(result);
    },
    [decryptObjectOrNull]
  );

  return (
    <keyContext.Provider
      value={{
        setPaperKeys,
        decryptThenHandleObj,
        decryptThenHandleArray,
      }}
    >
      {children}
    </keyContext.Provider>
  );
}

export function useKey() {
  return React.useContext(keyContext);
}
