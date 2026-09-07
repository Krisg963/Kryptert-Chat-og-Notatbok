/**
 * Real client-side End-to-End Encryption (E2EE) using Web Crypto API.
 * Uses AES-GCM with 256-bit keys and 96-bit (12-byte) random initialization vectors (IV).
 */

const keyCache = new Map<string, CryptoKey>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a secret passphrase and room identifier using PBKDF2.
 */
export async function getRoomKey(secretPassphrase: string, roomId: string): Promise<CryptoKey> {
  const cacheKey = `${roomId}:${secretPassphrase}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const enc = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secretPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode(`salt_e2ee_notater_${roomId}`);

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, derivedKey);
  return derivedKey;
}

/**
 * Encrypts plaintext message into base64 ciphertext and IV using AES-256-GCM.
 */
export async function encryptMessage(
  plaintext: string,
  secretPassphrase: string,
  roomId: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getRoomKey(secretPassphrase, roomId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(cipherBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts base64 ciphertext and IV into plaintext using AES-256-GCM.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  secretPassphrase: string,
  roomId: string
): Promise<string> {
  try {
    const key = await getRoomKey(secretPassphrase, roomId);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const cipherBuffer = base64ToArrayBuffer(ciphertextBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      cipherBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Kunne ikke dekryptere melding (ugyldig nøkkel eller feil rom)', err);
    return '🔒 [Kryptert melding - kan ikke dekrypteres med nåværende nøkkel]';
  }
}

/**
 * Generates an inspectable cryptographic fingerprint (e.g. for user key verification badge)
 */
export async function getKeyFingerprint(passphrase: string, roomId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${roomId}:${passphrase}`);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)} ${hex.slice(12, 16)}`.toUpperCase();
}
