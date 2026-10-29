/**
 * Backup encryption and PIN hashing — exercised against the real WebCrypto
 * implementation (Node exposes the same API as the browser).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBackup,
  readBackup,
  isEncryptedBackup,
  hashPin,
  verifyPin,
  cryptoAvailable,
} from '../app/js/store.js';
import { Qada } from '../app/js/core/engine.js';

const TODAY = '2026-10-29';

function sampleModel() {
  const model = Qada.create(
    {
      pubertyDate: '2004-01-01',
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  model.markRange('2004-01-01', '2007-12-31', 1);
  model.applyOutcome({ dateISO: TODAY, prayer: 'subh', prayed: true, qadaIndices: [] });
  return model;
}

test('WebCrypto is available in this environment', () => {
  assert.equal(cryptoAvailable(), true);
});

test('plain backups round-trip', async () => {
  const model = sampleModel();
  const text = await createBackup(model.toJSON());
  assert.equal(isEncryptedBackup(text), false);
  const data = await readBackup(text);
  const restored = Qada.fromJSON(data, TODAY);
  assert.equal(restored.stats().total, model.stats().total);
  assert.equal(restored.stats().done, model.stats().done);
});

test('encrypted backups round-trip with the right passphrase', async () => {
  const model = sampleModel();
  const text = await createBackup(model.toJSON(), { passphrase: 'correct horse battery' });
  assert.equal(isEncryptedBackup(text), true);

  const envelope = JSON.parse(text);
  assert.equal(envelope.encrypted, true);
  assert.equal(envelope.kdf.name, 'PBKDF2');
  assert.ok(envelope.kdf.iterations >= 300000);
  assert.ok(!text.includes('"marks"'), 'the payload must not be readable');

  const data = await readBackup(text, { passphrase: 'correct horse battery' });
  const restored = Qada.fromJSON(data, TODAY);
  assert.equal(restored.stats().done, model.stats().done);
});

test('a wrong passphrase is rejected', async () => {
  const text = await createBackup(sampleModel().toJSON(), { passphrase: 'right one' });
  await assert.rejects(() => readBackup(text, { passphrase: 'wrong one' }), /passphrase-wrong/);
});

test('a missing passphrase is reported distinctly', async () => {
  const text = await createBackup(sampleModel().toJSON(), { passphrase: 'secret123' });
  await assert.rejects(() => readBackup(text), /passphrase-required/);
});

test('tampered ciphertext is rejected, not silently accepted', async () => {
  const text = await createBackup(sampleModel().toJSON(), { passphrase: 'secret123' });
  const envelope = JSON.parse(text);
  const bytes = Buffer.from(envelope.cipher.data, 'base64');
  bytes[10] ^= 0xff;
  envelope.cipher.data = bytes.toString('base64');
  await assert.rejects(
    () => readBackup(JSON.stringify(envelope), { passphrase: 'secret123' }),
    /passphrase-wrong/,
  );
});

test('foreign files are refused', async () => {
  await assert.rejects(() => readBackup('{"hello":1}'), /invalid/);
  await assert.rejects(() => readBackup('not json at all'), /invalid/);
});

test('each export uses a fresh salt and IV', async () => {
  const model = sampleModel();
  const a = JSON.parse(await createBackup(model.toJSON(), { passphrase: 'same pass' }));
  const b = JSON.parse(await createBackup(model.toJSON(), { passphrase: 'same pass' }));
  assert.notEqual(a.kdf.salt, b.kdf.salt);
  assert.notEqual(a.cipher.iv, b.cipher.iv);
  assert.notEqual(a.cipher.data, b.cipher.data);
});

test('PIN hashing verifies and rejects correctly', async () => {
  const { hash, salt } = await hashPin('1234');
  const lock = { enabled: true, hash, salt };
  assert.equal(await verifyPin('1234', lock), true);
  assert.equal(await verifyPin('4321', lock), false);
  assert.equal(await verifyPin('12345', lock), false);
  assert.equal(await verifyPin('', { enabled: true }), false);
});

test('the same PIN hashes differently for different salts', async () => {
  const a = await hashPin('1234');
  const b = await hashPin('1234');
  assert.notEqual(a.hash, b.hash);
  assert.notEqual(a.salt, b.salt);
});
