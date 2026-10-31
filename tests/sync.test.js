/**
 * Sync: encryption at rest, the code that unlocks it, and the one request that
 * moves a ledger between two phones.
 *
 * The server is a dumb keyed blob store. It never sees plaintext and cannot
 * derive the key from the storage id, which is a hash of the code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import { generateCode, hashCode, isCode, normalizeCode } from '../app/js/sync/code.js';
import { seal, unseal } from '../app/js/sync/crypto.js';
import { makeClient } from '../app/js/sync/client.js';
import { forgetRemote, syncOnce } from '../app/js/sync/sync.js';

const TODAY = '2026-10-29';
const START = '2026-10-01';
const ENDPOINT = 'https://sync.example.test';

function model(marks = {}) {
  const instance = Qada.create(
    {
      pubertyDate: START,
      quotaPrayers: 5,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  for (const [date, prayers] of Object.entries(marks)) {
    for (const prayer of prayers) instance.setMark(date, prayer, 1);
  }
  return instance;
}

/** A fake server: a Map behind three verbs, exactly like the Worker. */
function fakeServer() {
  const store = new Map();
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const id = url.split('/').pop();
    calls.push(`${init.method || 'GET'} ${id}`);

    if (init.method === 'PUT') {
      store.set(id, JSON.parse(init.body));
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (init.method === 'DELETE') {
      store.delete(id);
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (!store.has(id)) return { ok: false, status: 404, json: async () => null };
    return { ok: true, status: 200, json: async () => store.get(id) };
  };
  return { fetchImpl, store, calls };
}

/* ------------------------------------------------------------------ */
/* Codes                                                               */
/* ------------------------------------------------------------------ */

test('a generated code is readable and valid', () => {
  const code = generateCode();
  assert.match(code, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);
  assert.equal(normalizeCode(code), code);
  assert.equal(isCode(code), true);
  assert.ok(!/[IO01]/.test(code), 'no confusable characters');
});

test('codes are unique', () => {
  const codes = new Set();
  for (let index = 0; index < 200; index += 1) codes.add(generateCode());
  assert.equal(codes.size, 200);
});

test('a pasted code is normalised', () => {
  const code = generateCode();
  assert.equal(normalizeCode(code.toLowerCase()), code);
  assert.equal(normalizeCode(code.replace(/-/g, ' ')), code);
  assert.equal(normalizeCode(`  ${code}  `), code);
});

test('bad codes are refused', () => {
  assert.equal(normalizeCode(''), null);
  assert.equal(normalizeCode('HELLO'), null);
  assert.equal(normalizeCode('IIII-IIII-IIII-IIII-IIII'), null, 'I is not in the alphabet');
  assert.equal(isCode('not a code'), false);
});

test('the server id is a hash, not the code', async () => {
  const code = generateCode();
  const id = await hashCode(code);
  assert.match(id, /^[a-f0-9]{40}$/);
  assert.ok(!id.includes(code.replace(/-/g, '')));
  assert.equal(await hashCode(code.toLowerCase()), id);
});

/* ------------------------------------------------------------------ */
/* Encryption                                                          */
/* ------------------------------------------------------------------ */

test('seal and unseal round trip', async () => {
  const code = generateCode();
  const payload = { hello: 'world', nested: { list: [1, 2, 3] } };
  const envelope = await seal(code, payload);

  assert.equal(envelope.v, 1);
  assert.ok(envelope.ct.length > 10);
  assert.deepEqual(await unseal(code, envelope), payload);
});

test('the envelope carries no plaintext', async () => {
  const code = generateCode();
  const envelope = await seal(code, { secret: 'prayer-ledger' });
  assert.ok(!JSON.stringify(envelope).includes('prayer-ledger'));
});

test('the wrong code cannot open an envelope', async () => {
  const envelope = await seal(generateCode(), { a: 1 });
  await assert.rejects(() => unseal(generateCode(), envelope));
});

test('each seal uses a fresh salt and iv', async () => {
  const code = generateCode();
  const first = await seal(code, { a: 1 });
  const second = await seal(code, { a: 1 });
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.ct, second.ct);
});

test('a corrupted envelope is refused', async () => {
  const code = generateCode();
  const envelope = await seal(code, { a: 1 });
  await assert.rejects(() => unseal(code, { ...envelope, ct: 'AAAA' }));
  await assert.rejects(() => unseal(code, null));
});

/* ------------------------------------------------------------------ */
/* The request                                                         */
/* ------------------------------------------------------------------ */

test('the first sync pushes and the second is a no-op', async () => {
  const { fetchImpl, store } = fakeServer();
  const code = generateCode();
  const local = model({ '2026-10-10': ['subh', 'dhuhr'] });

  const first = await syncOnce({ endpoint: ENDPOINT, code, model: local, fetchImpl });
  assert.equal(first.status, 'pushed');
  assert.equal(first.changed, false);
  assert.equal(store.size, 1);

  const second = await syncOnce({ endpoint: ENDPOINT, code, model: local, fetchImpl });
  assert.equal(second.status, 'current');
  assert.equal(second.changed, false);
});

test('a second device pulls what the first pushed', async () => {
  const { fetchImpl } = fakeServer();
  const code = generateCode();

  const phone = model({ '2026-10-10': ['subh', 'dhuhr'] });
  await syncOnce({ endpoint: ENDPOINT, code, model: phone, fetchImpl });

  const tablet = model();
  const result = await syncOnce({ endpoint: ENDPOINT, code, model: tablet, fetchImpl });

  assert.equal(result.status, 'merged');
  assert.equal(result.changed, true);
  assert.equal(result.model.stats().done, 2);
  assert.equal(result.model.profile.location.name, 'Tunis', 'the local profile is kept');
});

test('both sides keep their own marks after a round trip', async () => {
  const { fetchImpl } = fakeServer();
  const code = generateCode();

  const phone = model({ '2026-10-10': ['subh'] });
  await syncOnce({ endpoint: ENDPOINT, code, model: phone, fetchImpl });

  const tablet = model({ '2026-10-10': ['asr'] });
  const merged = await syncOnce({ endpoint: ENDPOINT, code, model: tablet, fetchImpl });
  assert.equal(merged.model.stats().done, 2);

  // The phone syncs again and must pick up the tablet's prayer.
  const phoneAgain = await syncOnce({ endpoint: ENDPOINT, code, model: phone, fetchImpl });
  assert.equal(phoneAgain.model.stats().done, 2);
});

test('the server never receives the ledger in clear', async () => {
  const { fetchImpl, store } = fakeServer();
  const code = generateCode();
  const local = model({ '2026-10-10': ['subh'] });

  await syncOnce({ endpoint: ENDPOINT, code, model: local, fetchImpl });

  const stored = JSON.stringify([...store.values()]);
  assert.ok(!stored.includes('Tunis'));
  assert.ok(!stored.includes('2019-01-01'));
  assert.ok(stored.includes('"ct"'));
});

test('a wrong code cannot read what another code wrote', async () => {
  const { fetchImpl } = fakeServer();
  const writer = generateCode();
  const reader = generateCode();

  await syncOnce({ endpoint: ENDPOINT, code: writer, model: model({ '2026-10-10': ['subh'] }), fetchImpl });

  // The reader hashes to a different id, so it sees an empty slot — no crash.
  const result = await syncOnce({ endpoint: ENDPOINT, code: reader, model: model(), fetchImpl });
  assert.equal(result.status, 'pushed');
});

test('a bad code is refused before any request', async () => {
  const { fetchImpl, calls } = fakeServer();
  await assert.rejects(
    () => syncOnce({ endpoint: ENDPOINT, code: 'nope', model: model(), fetchImpl }),
    /bad-code/,
  );
  assert.equal(calls.length, 0);
});

test('an HTTP failure surfaces instead of losing data', async () => {
  const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(
    () => syncOnce({ endpoint: ENDPOINT, code: generateCode(), model: model(), fetchImpl: failing }),
    /http-500/,
  );
});

test('a missing endpoint is refused', () => {
  assert.throws(() => makeClient({ endpoint: '' }), /no-endpoint/);
});

test('the remote copy can be deleted', async () => {
  const { fetchImpl, store } = fakeServer();
  const code = generateCode();
  await syncOnce({ endpoint: ENDPOINT, code, model: model(), fetchImpl });
  assert.equal(store.size, 1);

  await forgetRemote({ endpoint: ENDPOINT, code, fetchImpl });
  assert.equal(store.size, 0);
});
