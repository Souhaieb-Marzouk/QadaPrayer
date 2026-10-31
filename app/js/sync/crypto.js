/**
 * Encryption for sync: the same construction as the backups (PBKDF2-SHA256 →
 * AES-GCM-256), with the sync code as the passphrase.
 *
 * The server only ever sees `{ v, salt, iv, ct }` — no plaintext, no key.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ITERATIONS = 310000;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt any JSON-serialisable value into a self-contained envelope. */
export async function seal(passphrase, value) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return { v: 1, salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(cipher) };
}

/** Decrypt an envelope. Throws when the code is wrong or the data is damaged. */
export async function unseal(passphrase, envelope) {
  if (!envelope || envelope.v !== 1 || !envelope.salt || !envelope.iv || !envelope.ct) {
    throw new Error('bad-envelope');
  }
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(envelope.ct));
  return JSON.parse(decoder.decode(plain));
}
