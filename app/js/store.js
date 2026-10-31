/**
 * Persistence, undo history, backup files and the PIN gate.
 *
 * The app is local-first: one JSON document in `localStorage`, no network, no
 * accounts. The encryption helpers use WebCrypto, so an exported backup can be
 * protected with a passphrase without shipping any third-party crypto code.
 */

import { Qada } from './core/engine.js';
import { todayISO } from './core/dates.js';
import {
  DOC_VERSION,
  activeData,
  addProfile as pushProfile,
  profileSync,
  setProfileSync,
  defaultName,
  normalizeDoc,
  removeProfile as dropProfile,
  renameProfile as setProfileName,
  setActiveData,
  switchTo as selectProfile,
  wrapState,
} from './profiles.js';

const DOC_KEY = 'qada.state.v2';
const STATE_KEY = 'qada.state.v1';
const MIGRATED_KEY = 'qada.state.v1.migrated';
const META_KEY = 'qada.meta.v1';
const SNAP_KEY = 'qada.snapshots.v1';
const SNAP_LIMIT = 5;
const SNAP_MIN_MS = 60 * 1000;
const UNDO_LIMIT = 12;
const PBKDF2_ITERATIONS = 310000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/* ------------------------------------------------------------------ */
/* base64 helpers (browser + node)                                     */
/* ------------------------------------------------------------------ */

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function cryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

async function deriveKey(passphrase, salt, iterations = PBKDF2_ITERATIONS) {
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/* ------------------------------------------------------------------ */
/* Backup envelope                                                     */
/* ------------------------------------------------------------------ */

const BACKUP_APP = 'qada';
const BACKUP_VERSION = 1;

export async function createBackup(stateObject, { passphrase = '' } = {}) {
  const payload = JSON.stringify(stateObject);
  const envelope = {
    app: BACKUP_APP,
    kind: 'backup',
    v: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    encrypted: false,
  };
  if (!passphrase) {
    envelope.data = JSON.parse(payload);
    return JSON.stringify(envelope, null, 2);
  }
  if (!cryptoAvailable()) {
    throw new Error('Encryption is not available in this browser.');
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(payload),
  );
  return JSON.stringify(
    {
      ...envelope,
      encrypted: true,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: bytesToBase64(salt) },
      cipher: { name: 'AES-GCM', iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(cipher)) },
    },
    null,
    2,
  );
}

export async function readBackup(text, { passphrase = '' } = {}) {
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('invalid');
  }
  if (!envelope || envelope.app !== BACKUP_APP || envelope.kind !== 'backup') {
    throw new Error('invalid');
  }
  if (envelope.v > BACKUP_VERSION) throw new Error('newer');

  if (!envelope.encrypted) {
    if (!envelope.data) throw new Error('invalid');
    return envelope.data;
  }

  if (!passphrase) throw new Error('passphrase-required');
  if (!cryptoAvailable()) throw new Error('unsupported');

  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const data = base64ToBytes(envelope.cipher.data);
  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations || PBKDF2_ITERATIONS);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(textDecoder.decode(plain));
  } catch {
    throw new Error('passphrase-wrong');
  }
}

export function isEncryptedBackup(text) {
  try {
    const parsed = JSON.parse(text);
    return Boolean(parsed?.app === BACKUP_APP && parsed.encrypted);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* PIN gate                                                            */
/* ------------------------------------------------------------------ */

export async function hashPin(pin, saltBase64) {
  const salt = saltBase64 ? base64ToBytes(saltBase64) : randomBytes(16);
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(`pin:${pin}`),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    material,
    256,
  );
  return {
    hash: bytesToBase64(new Uint8Array(bits)),
    salt: saltBase64 || bytesToBase64(salt),
  };
}

export async function verifyPin(pin, lock) {
  if (!lock?.hash || !lock?.salt) return false;
  const { hash } = await hashPin(pin, lock.salt);
  return timingSafeEqual(hash, lock.hash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* Local store                                                         */
/* ------------------------------------------------------------------ */

function safeStorage() {
  try {
    const probe = '__qada_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export class Store {
  constructor() {
    this.storage = safeStorage();
    this.memory = null;
    this.undoStack = [];
    this.saveTimer = null;
    this.meta = this.readMeta();
  }

  get persistent() {
    return Boolean(this.storage);
  }

  readMeta() {
    try {
      const raw = this.storage?.getItem(META_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  writeMeta(patch) {
    this.meta = { ...this.meta, ...patch };
    try {
      this.storage?.setItem(META_KEY, JSON.stringify(this.meta));
    } catch {
      /* ignore quota errors */
    }
  }

  readRaw() {
    if (!this.storage) return this.memory;
    try {
      return this.storage.getItem(DOC_KEY) || this.storage.getItem(STATE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Load the saved document and return the active profile's model.
   * A v1 payload is migrated once, with a safety copy kept under
   * `qada.state.v1.migrated`.
   */
  load() {
    const raw = this.readRaw();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const legacy =
        !(parsed.v === DOC_VERSION && Array.isArray(parsed.profiles) && parsed.profiles.length);

      this.doc = normalizeDoc(parsed, defaultName(parsed?.profile?.language));
      if (!this.doc) return null;

      if (legacy) {
        try {
          this.storage?.setItem(MIGRATED_KEY, raw);
        } catch {
          /* best effort */
        }
        // Only drop the old key once the new one is safely written.
        if (this.persistNow()) {
          try {
            this.storage?.removeItem(STATE_KEY);
          } catch {
            /* best effort */
          }
        }
      }

      // Sync settings used to live in the app metadata. They belong to a profile
      // now, so each person can keep their own code.
      if (!profileSync(this.doc).code && this.meta?.syncCode) {
        setProfileSync(this.doc, {
          code: this.meta.syncCode,
          endpoint: this.meta.syncEndpoint || '',
          lastSyncAt: this.meta.lastSyncAt || '',
        });
        this.persistNow();
      }

      return this.buildModel();
    } catch (error) {
      console.error('[qada] could not read the saved state', error);
      return null;
    }
  }

  /** The model of the active profile, built from the document. */
  buildModel() {
    const data = activeData(this.doc);
    if (!data) return null;
    return Qada.fromJSON(data, todayISO(data?.profile?.location?.tz || 'UTC'));
  }

  persistNow() {
    if (!this.doc) return false;
    const payload = JSON.stringify(this.doc);
    try {
      if (this.storage) this.storage.setItem(DOC_KEY, payload);
      else this.memory = payload;
      this.rememberSnapshot(payload);
      return true;
    } catch (error) {
      console.error('[qada] could not persist state', error);
      return false;
    }
  }

  /** Rolling local copies: five of them, at most one a minute. */
  readSnapshots() {
    try {
      const raw = this.storage?.getItem(SNAP_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  rememberSnapshot(payload) {
    if (!this.storage || !payload) return;
    const now = Date.now();
    if (this.lastSnapAt && now - this.lastSnapAt < SNAP_MIN_MS) return;
    this.lastSnapAt = now;
    try {
      const list = this.readSnapshots();
      list.unshift({ at: new Date(now).toISOString(), payload });
      this.storage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, SNAP_LIMIT)));
    } catch {
      /* the ledger itself is already saved */
    }
  }

  listSnapshots() {
    return this.readSnapshots().map((entry) => ({
      at: entry.at,
      size: String(entry.payload || '').length,
    }));
  }

  restoreSnapshot(at) {
    const entry = this.readSnapshots().find((item) => item.at === at);
    if (!entry) return null;
    try {
      const doc = normalizeDoc(JSON.parse(entry.payload), 'Me');
      if (!doc) return null;
      this.doc = doc;
      this.persistNow();
      return this.buildModel();
    } catch {
      return null;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Profiles                                                          */
  /* ---------------------------------------------------------------- */

  listProfiles() {
    if (!this.doc) return [];
    return this.doc.profiles.map((entry) => ({
      id: entry.id,
      name: entry.name,
      active: entry.id === this.doc.activeId,
      createdAt: entry.createdAt,
    }));
  }

  get activeId() {
    return this.doc?.activeId ?? null;
  }

  /** Sync settings of the active profile — one code per person. */
  getSync() {
    return profileSync(this.doc);
  }

  setSync(patch) {
    if (!this.doc) return;
    setProfileSync(this.doc, patch);
    this.persistNow();
  }

  switchTo(id, currentModel) {
    if (!this.doc) return null;
    if (currentModel) setActiveData(this.doc, currentModel.toJSON());
    selectProfile(this.doc, id);
    this.persistNow();
    return this.buildModel();
  }

  /** Register a brand-new ledger (already built by the onboarding). */
  addProfile(name, model, currentModel) {
    const data = model.toJSON();
    if (!this.doc) {
      this.doc = wrapState(data, name);
    } else {
      if (currentModel) setActiveData(this.doc, currentModel.toJSON());
      pushProfile(this.doc, name, data);
    }
    this.persistNow();
    return model;
  }

  removeProfile(id, currentModel) {
    if (!this.doc) return null;
    if (currentModel) setActiveData(this.doc, currentModel.toJSON());
    dropProfile(this.doc, id);
    this.persistNow();
    return this.buildModel();
  }

  renameProfile(id, name) {
    if (!this.doc) return;
    setProfileName(this.doc, id, name);
    this.persistNow();
  }

  save(model, { immediate = false } = {}) {
    if (model) {
      if (!this.doc) {
        this.doc = wrapState(model.toJSON(), defaultName(model.profile?.language));
      } else {
        setActiveData(this.doc, model.toJSON());
      }
    }

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const write = () => this.persistNow();
    if (immediate) write();
    else this.saveTimer = setTimeout(write, 180);
  }

  flush(model) {
    if (model) this.save(model, { immediate: true });
  }

  snapshot(model) {
    if (!model) return;
    this.undoStack.push(JSON.stringify(model.toJSON()));
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  undo() {
    if (!this.undoStack.length) return null;
    const raw = this.undoStack.pop();
    try {
      const parsed = JSON.parse(raw);
      const tz = parsed?.profile?.location?.tz || 'UTC';
      return Qada.fromJSON(parsed, todayISO(tz));
    } catch {
      return null;
    }
  }

  clear() {
    this.undoStack = [];
    this.doc = null;
    try {
      this.storage?.removeItem(DOC_KEY);
      this.storage?.removeItem(STATE_KEY);
      this.storage?.removeItem(MIGRATED_KEY);
    } catch {
      /* ignore */
    }
    this.memory = null;
  }
}
