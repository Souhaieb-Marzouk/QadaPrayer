/**
 * Momentum: streaks, weekly/monthly summaries, and "I prayed extra".
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada, slotIndex } from '../app/js/core/engine.js';
import { PRAYERS, addDays } from '../app/js/core/dates.js';

const TODAY = '2026-10-29';
const START = '2026-10-20';

function model(overrides = {}) {
  return Qada.create(
    {
      pubertyDate: START,
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
      ...overrides,
    },
    TODAY,
  );
}

function completeDay(instance, dateISO) {
  for (const prayer of PRAYERS) instance.setMark(dateISO, prayer, 1);
}

function exemptDay(instance, dateISO) {
  for (const prayer of PRAYERS) instance.setMark(dateISO, prayer, 2);
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

test('a fresh ledger has no streak', () => {
  const instance = model();
  assert.deepEqual(instance.streaks(TODAY), { current: 0, best: 0 });
});

test('consecutive complete days build the streak', () => {
  const instance = model();
  for (const date of ['2026-10-26', '2026-10-27', '2026-10-28']) completeDay(instance, date);
  assert.deepEqual(instance.streaks(TODAY), { current: 3, best: 3 });
});

test('an incomplete today does not break yesterday’s streak', () => {
  const instance = model();
  for (const date of ['2026-10-27', '2026-10-28']) completeDay(instance, date);
  // 2026-10-29 intentionally left empty.
  assert.equal(instance.streaks(TODAY).current, 2);
});

test('a complete today extends the streak', () => {
  const instance = model();
  for (const date of ['2026-10-27', '2026-10-28']) completeDay(instance, date);
  completeDay(instance, TODAY);
  assert.deepEqual(instance.streaks(TODAY), { current: 3, best: 3 });
});

test('an exempt day neither breaks nor extends the run', () => {
  const instance = model();
  completeDay(instance, '2026-10-26');
  exemptDay(instance, '2026-10-27');
  completeDay(instance, '2026-10-28');
  assert.equal(instance.streaks(TODAY).current, 2);
});

test('a missed day resets the current streak but keeps the best', () => {
  const instance = model();
  for (const date of ['2026-10-20', '2026-10-21', '2026-10-22']) completeDay(instance, date);
  instance.setMark('2026-10-25', 'subh', 1); // a stray prayer, but not a full day
  for (const date of ['2026-10-27', '2026-10-28']) completeDay(instance, date);

  const { current, best } = instance.streaks(TODAY);
  assert.equal(current, 2);
  assert.equal(best, 3);
});

/* ------------------------------------------------------------------ */
/* Range summary                                                       */
/* ------------------------------------------------------------------ */

test('the range summary separates complete, partial and missed days', () => {
  const instance = model();
  completeDay(instance, '2026-10-26');
  instance.setMark('2026-10-27', 'subh', 1); // partial
  exemptDay(instance, '2026-10-28');

  const summary = instance.rangeSummary('2026-10-26', '2026-10-28');
  assert.equal(summary.days, 3);
  assert.equal(summary.complete, 1);
  assert.equal(summary.partial, 1);
  assert.equal(summary.exempt, 1);
  assert.equal(summary.missed, 0);
});

test('a fully missed range counts every day as missed', () => {
  const instance = model();
  const summary = instance.rangeSummary('2026-10-24', '2026-10-26');
  assert.equal(summary.missed, 3);
  assert.equal(summary.complete, 0);
  assert.equal(summary.owed, 15);
  assert.equal(summary.done, 0);
});

test('recentActivity reports owed and done per day', () => {
  const instance = model();
  completeDay(instance, '2026-10-28');
  const activity = instance.recentActivity(TODAY, 3);
  assert.equal(activity.length, 3);
  const yesterday = activity.find((entry) => entry.dateISO === '2026-10-28');
  assert.equal(yesterday.done, 5);
  assert.equal(yesterday.owed, 5);
});

/* ------------------------------------------------------------------ */
/* Extra make-ups                                                      */
/* ------------------------------------------------------------------ */

test('"prayed extra" consumes the oldest owed prayers', () => {
  const instance = model();
  const before = instance.stats().remaining;
  const head = instance.firstUndone(instance.startIndex, instance.backlogEnd(TODAY), 3);

  const marked = instance.markNextMakeUps(3, TODAY);

  assert.deepEqual(marked, head);
  assert.equal(instance.stats().remaining, before - 3);
  for (const index of head) assert.equal(instance.get(index), 1);
});

test('"prayed extra" respects what is left', () => {
  const instance = model();
  const remaining = instance.stats().remaining;
  const marked = instance.markNextMakeUps(remaining + 50, TODAY);
  assert.equal(marked.length, remaining);
  assert.equal(instance.stats().remaining, 0);
});

test('"prayed extra" with zero or nonsense does nothing', () => {
  const instance = model();
  const before = instance.stats().done;
  assert.deepEqual(instance.markNextMakeUps(0, TODAY), []);
  assert.deepEqual(instance.markNextMakeUps(-5, TODAY), []);
  assert.deepEqual(instance.markNextMakeUps('abc', TODAY), []);
  assert.equal(instance.stats().done, before);
});

test('extra make-ups are taken in order across days', () => {
  const instance = model();
  const first = instance.markNextMakeUps(2, TODAY);
  const second = instance.markNextMakeUps(2, TODAY);
  assert.ok(Math.max(...second) > Math.max(...first), 'the second batch must come later');
  assert.equal(first[0], slotIndex(START, 'dhuhr'));
});

test('the extra count is capped', () => {
  const instance = model();
  const marked = instance.markNextMakeUps(10000, TODAY);
  assert.ok(marked.length <= 500);
});

test('extra marks are reflected in the next day’s plan', () => {
  const instance = model();
  const tomorrow = addDays(TODAY, 1);
  const before = instance.plan(tomorrow).items[0].qada[0];
  instance.markNextMakeUps(10, TODAY);
  const after = instance.plan(tomorrow).items[0].qada[0];
  assert.ok(after > before);
});
