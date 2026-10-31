/**
 * Sync codes: 100 bits, typed and read by humans.
 *
 * Crockford-style base32 without I, O, 0 and 1 — the characters people confuse
 * on a phone screen. 20 characters, shown as five groups of four.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, exactly
const LENGTH = 20;

export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  // 256 is a multiple of 32, so masking the low bits stays uniform.
  const chars = Array.from(bytes, (byte) => ALPHABET[byte & 31]).join('');
  return chars.match(/.{4}/g).join('-');
}

/** Accept anything the user pastes; return the canonical form or null. */
export function normalizeCode(input) {
  const raw = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (raw.length !== LENGTH) return null;
  for (const char of raw) {
    if (!ALPHABET.includes(char)) return null;
  }
  return raw.match(/.{4}/g).join('-');
}

export function isCode(input) {
  return normalizeCode(input) !== null;
}

/**
 * What the server is told: a hash of the (normalised) code, so the storage key
 * itself reveals nothing. The server cannot derive the key from it.
 */
export async function hashCode(code) {
  const normalised = normalizeCode(code);
  if (!normalised) throw new Error('bad-code');
  const data = new TextEncoder().encode(`qada-sync:v1:${normalised}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40);
}
