/** Merging a backup into the current ledger. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada, MARK_DONE, MARK_EXEMPT, slotIndex } from '../app/js/core/engine.js';
import { mergeModels } from '../app/js/merge.js';

const TODAY = '2026-10-29';
const START = '2026-10-01';

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

const day = '2026-10-10';

test('a merge keeps what only one side had', () => {
  const local = model({ [day]: ['subh'] });
  const incoming = model({ [day]: ['asr'] });

  const merged = mergeModels(local, incoming);

  assert.equal(merged.get(slotIndex(day, 'subh')), MARK_DONE);
  assert.equal(merged.get(slotIndex(day, 'asr')), MARK_DONE);
  assert.equal(merged.get(slotIndex(day, 'dhuhr')), 0);
});

test('the merged done count is the union', () => {
  const local = model({ [day]: ['subh', 'dhuhr'] });
  const incoming = model({ [day]: ['asr', 'maghreb'] });

  const merged = mergeModels(local, incoming);
  assert.equal(merged.stats().done, 4);
  assert.equal(merged.stats().done >= Math.max(local.stats().done, incoming.stats().done), true);
});

test('exempt days stay exempt when neither side prayed', () => {
  const local = model();
  local.markRange('2026-10-12', '2026-10-12', MARK_EXEMPT);
  const incoming = model();

  const merged = mergeModels(local, incoming);
  assert.equal(merged.get(slotIndex('2026-10-12', 'dhuhr')), MARK_EXEMPT);
});

test('a prayer prayed on either side wins over exempt', () => {
  const local = model();
  local.markRange('2026-10-12', '2026-10-12', MARK_EXEMPT);
  const incoming = model({ '2026-10-12': ['dhuhr'] });

  const merged = mergeModels(local, incoming);
  assert.equal(merged.get(slotIndex('2026-10-12', 'dhuhr')), MARK_DONE);
});

test('the local profile is kept, not the incoming one', () => {
  const local = model();
  const incoming = Qada.create(
    {
      pubertyDate: '2015-03-03',
      location: { name: 'Sfax', country: 'Tunisia', lat: 34.74, lon: 10.76, tz: 'Africa/Tunis' },
    },
    TODAY,
  );

  const merged = mergeModels(local, incoming);
  assert.equal(merged.profile.pubertyDate, START);
  assert.equal(merged.profile.location.name, 'Tunis');
});

test('deferrals are dropped, history is kept', () => {
  const local = model({ [day]: ['subh'] });
  local.applyOutcome({ dateISO: TODAY, prayer: 'asr', prayed: false, defer: 'tomorrow' });
  const incoming = model({ [day]: ['asr'] });

  const merged = mergeModels(local, incoming);
  assert.deepEqual(merged.data.pauses, {});
  assert.equal(merged.plan(TODAY).pausedMask, 0);
  assert.ok(merged.data.log.length >= local.data.log.length);
});

test('merging is idempotent', () => {
  const local = model({ [day]: ['subh', 'asr'] });
  const incoming = model({ [day]: ['asr', 'isha'] });

  const once = mergeModels(local, incoming);
  const twice = mergeModels(once, incoming);

  assert.equal(twice.stats().done, once.stats().done);
  assert.equal(twice.stats().remaining, once.stats().remaining);
});

test('a merge never loses marks from the local side', () => {
  const local = model({ '2026-10-05': ['subh', 'dhuhr', 'asr', 'maghreb', 'isha'] });
  const before = local.stats().done;
  const incoming = model();

  const merged = mergeModels(local, incoming);
  assert.equal(merged.stats().done, before);
});

test('neither input is modified', () => {
  const local = model({ [day]: ['subh'] });
  const incoming = model({ [day]: ['asr'] });
  const localBefore = local.stats().done;
  const incomingBefore = incoming.stats().done;

  mergeModels(local, incoming);

  assert.equal(local.stats().done, localBefore);
  assert.equal(incoming.stats().done, incomingBefore);
});
