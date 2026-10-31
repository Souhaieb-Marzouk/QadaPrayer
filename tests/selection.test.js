/** Un-ticking a prayer or a single make-up, and moving leftovers to tomorrow. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada, MARK_DONE, MARK_MISSED, slotIndex } from '../app/js/core/engine.js';
import { PRAYERS } from '../app/js/core/dates.js';

const TODAY = '2026-10-29';
const START = '2026-10-01';

function model() {
  return Qada.create(
    {
      pubertyDate: START,
      quotaPrayers: 15,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
}

test('a selection marks the prayer and the chosen make-ups', () => {
  const instance = model();
  const plan = instance.plan(TODAY);
  const item = plan.items[0];
  const picked = item.qada.slice(0, 2);

  instance.applySelection({
    dateISO: TODAY,
    prayer: item.prayer,
    self: MARK_DONE,
    qada: Object.fromEntries(picked.map((index) => [index, MARK_DONE])),
  });

  assert.equal(instance.get(slotIndex(TODAY, item.prayer)), MARK_DONE);
  for (const index of picked) assert.equal(instance.get(index), MARK_DONE);
});

test('un-ticking the prayer puts it back to missed', () => {
  const instance = model();
  const prayer = 'subh';
  instance.applySelection({ dateISO: TODAY, prayer, self: MARK_DONE, qada: {} });
  assert.equal(instance.get(slotIndex(TODAY, prayer)), MARK_DONE);

  instance.applySelection({ dateISO: TODAY, prayer, self: MARK_MISSED, qada: {} });
  assert.equal(instance.get(slotIndex(TODAY, prayer)), MARK_MISSED);
});

test('one make-up can be un-ticked while the others stay done', () => {
  const instance = model();
  const item = instance.plan(TODAY).items[0];
  const three = item.qada.slice(0, 3);
  assert.equal(three.length, 3);

  instance.applySelection({
    dateISO: TODAY,
    prayer: item.prayer,
    self: MARK_DONE,
    qada: Object.fromEntries(three.map((index) => [index, MARK_DONE])),
  });

  // un-tick the middle one
  instance.applySelection({
    dateISO: TODAY,
    prayer: item.prayer,
    self: MARK_DONE,
    qada: { [three[1]]: MARK_MISSED },
  });

  assert.equal(instance.get(three[0]), MARK_DONE);
  assert.equal(instance.get(three[1]), MARK_MISSED);
  assert.equal(instance.get(three[2]), MARK_DONE);
});

test('applyOutcome remembers which make-ups went with a prayer', () => {
  const instance = model();
  const item = instance.plan(TODAY).items[1];
  const picked = item.qada.slice(0, 2);

  instance.applyOutcome({
    dateISO: TODAY,
    prayer: item.prayer,
    prayed: true,
    qadaIndices: picked,
  });

  assert.deepEqual(instance.lastQadaIndices(TODAY, item.prayer), picked);
});

test('the recorded make-ups can be listed again for correction', () => {
  const instance = model();
  const item = instance.plan(TODAY).items[2];
  const picked = item.qada.slice(0, 1);

  instance.applyOutcome({ dateISO: TODAY, prayer: item.prayer, prayed: true, qadaIndices: picked });

  const listed = new Set([
    ...instance.lastQadaIndices(TODAY, item.prayer),
    ...(instance.plan(TODAY).items.find((entry) => entry.prayer === item.prayer)?.qada || []),
  ]);

  for (const index of picked) assert.ok(listed.has(index), 'the marked one is still listed');
});

test('marking a prayer done leaves the rest bookable, and tomorrow keeps them', () => {
  const instance = model();
  const item = instance.plan(TODAY).items[0];
  const leftover = item.qada.slice(1);

  instance.applySelection({
    dateISO: TODAY,
    prayer: item.prayer,
    self: MARK_DONE,
    qada: item.qada.length ? { [item.qada[0]]: MARK_DONE } : {},
  });

  instance.pausePrayer(TODAY, item.prayer);

  assert.notEqual(instance.plan(TODAY).pausedMask, 0, 'today now pauses that prayer');
  assert.ok(instance.plan(TODAY + '').items.length === 5);

  const tomorrow = instance.plan('2026-10-30');
  const tomorrowQada = tomorrow.items.reduce((total, entry) => total + entry.qada.length, 0);
  const todayQada = instance.plan(TODAY).items.reduce((total, entry) => total + entry.qada.length, 0);
  assert.ok(tomorrowQada > todayQada, 'the leftovers move to tomorrow');
  assert.ok(leftover.length === 0 || tomorrowQada >= leftover.length);
});

test('every prayer can be un-ticked back to nothing', () => {
  const instance = model();
  for (const prayer of PRAYERS) {
    instance.applySelection({ dateISO: TODAY, prayer, self: MARK_DONE, qada: {} });
  }
  const before = instance.dayTally(TODAY).done;
  assert.equal(before, 5);

  for (const prayer of PRAYERS) {
    instance.applySelection({ dateISO: TODAY, prayer, self: MARK_MISSED, qada: {} });
  }
  assert.equal(instance.dayTally(TODAY).done, 0);
});
