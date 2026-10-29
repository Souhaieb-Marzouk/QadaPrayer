import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays,
  dayNumber,
  dayOfISO,
  daysInMonth,
  fromDayNumber,
  fromISO,
  localToInstant,
  toISO,
  todayISO,
  tzOffsetMinutes,
  weekdayOf,
} from '../app/js/core/dates.js';
import { computeDay, computeTimes, prayerStateAt } from '../app/js/core/prayerTimes.js';
import { decodeRuns, encodeRuns } from '../app/js/core/rle.js';
import { Qada, MARK_DONE, MARK_EXEMPT, slotIndex } from '../app/js/core/engine.js';

/* ------------------------------------------------------------------ */
/* dates                                                               */
/* ------------------------------------------------------------------ */

test('day numbers round-trip', () => {
  for (const iso of ['1970-01-01', '2004-01-01', '2026-10-29', '1999-12-31']) {
    const { y, m, d } = fromISO(iso);
    assert.equal(toISO(fromDayNumber(dayNumber(y, m, d))), iso);
  }
});

test('leap years and month lengths', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2025, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2026, 10), 31);
});

test('addDays crosses months, years and leap days', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2000-01-01', 366), '2001-01-01');
});

test('weekday index is correct', () => {
  assert.equal(weekdayOf('1970-01-01'), 4); // Thursday
  assert.equal(weekdayOf('2026-10-29'), 4); // Thursday
});

test('Tunisia timezone offsets follow historical DST', () => {
  // Tunisia observed DST in 2005, and abolished it afterwards.
  const summer2005 = localToInstant(2005, 7, 1, 12 * 60, 'Africa/Tunis');
  assert.equal(tzOffsetMinutes('Africa/Tunis', summer2005), 120);

  const summer2026 = localToInstant(2026, 7, 1, 12 * 60, 'Africa/Tunis');
  assert.equal(tzOffsetMinutes('Africa/Tunis', summer2026), 60);
});

test('localToInstant handles the DST switch in Europe/Paris', () => {
  const winter = localToInstant(2026, 1, 15, 12 * 60, 'Europe/Paris');
  const summer = localToInstant(2026, 7, 15, 12 * 60, 'Europe/Paris');
  assert.equal(tzOffsetMinutes('Europe/Paris', winter), 60);
  assert.equal(tzOffsetMinutes('Europe/Paris', summer), 120);
});

test('todayISO respects the timezone', () => {
  const instant = Date.UTC(2026, 9, 29, 23, 30); // 00:30 next day in Tunis
  assert.equal(todayISO('UTC', instant), '2026-10-29');
  assert.equal(todayISO('Africa/Tunis', instant), '2026-10-30');
});

/* ------------------------------------------------------------------ */
/* prayer times                                                        */
/* ------------------------------------------------------------------ */

const TUNIS = {
  lat: 36.8065,
  lon: 10.1815,
  tz: 'Africa/Tunis',
};

test('Tunis 2026-10-29 matches the reference timetable', () => {
  // Reference (Aladhan, Muslim World League): 05:13 06:40 12:03 15:03 17:26 18:48
  const day = computeDay({ ...TUNIS, dateISO: '2026-10-29', method: 'mwl' });
  const expected = { subh: 313, sunrise: 400, dhuhr: 724, asr: 902, maghreb: 1046, isha: 1128 };
  for (const [key, value] of Object.entries(expected)) {
    assert.ok(
      Math.abs(day.times[key] - value) <= 1,
      `${key}: got ${day.times[key]}, expected ~${value}`,
    );
  }
});

test('prayer windows are ordered and Isha crosses midnight', () => {
  const day = computeDay({ ...TUNIS, dateISO: '2026-10-29', method: 'mwl' });
  const order = ['subh', 'dhuhr', 'asr', 'maghreb', 'isha'];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(day.times[order[i]] > day.times[order[i - 1]]);
  }
  assert.ok(day.windows.isha.end > 1440);
  assert.ok(day.windows.subh.end <= day.windows.dhuhr.start);
});

test('asr is later with the Hanafi shadow factor', () => {
  const standard = computeTimes({ ...TUNIS, dateISO: '2026-10-29', asrShadow: 1 });
  const hanafi = computeTimes({ ...TUNIS, dateISO: '2026-10-29', asrShadow: 2 });
  assert.ok(hanafi.times.asr > standard.times.asr);
});

test('high latitude falls back instead of throwing', () => {
  const day = computeDay({
    dateISO: '2026-06-21',
    lat: 69.6492,
    lon: 18.9553,
    tz: 'Europe/Oslo',
    method: 'mwl',
  });
  assert.equal(day.meta.highLatitude, true);
  for (const value of Object.values(day.times)) {
    assert.ok(Number.isFinite(value) && value >= 0 && value < 1440);
  }
});

test('prayerStateAt reports the current obligation', () => {
  const day = computeDay({ ...TUNIS, dateISO: '2026-10-29', method: 'mwl' });
  assert.equal(prayerStateAt(day, day.times.subh + 5).current, 'subh');
  assert.equal(prayerStateAt(day, day.times.dhuhr + 5).current, 'dhuhr');
  assert.equal(prayerStateAt(day, day.times.maghreb + 5).current, 'maghreb');
  assert.equal(prayerStateAt(day, day.times.isha + 5).current, 'isha');
});

/* ------------------------------------------------------------------ */
/* run-length encoding                                                 */
/* ------------------------------------------------------------------ */

test('RLE round-trips and skips zero fills', () => {
  const values = new Uint8Array(50);
  values[10] = 1;
  values[11] = 1;
  values[30] = 2;
  const runs = encodeRuns(values, values.length);
  const back = decodeRuns(runs, values.length);
  assert.deepEqual(Array.from(back), Array.from(values));
});

test('RLE rejects corrupt input', () => {
  assert.throws(() => decodeRuns([[1]], 5));
  assert.throws(() => decodeRuns([[1, -2]], 5));
});

/* ------------------------------------------------------------------ */
/* the qada model                                                      */
/* ------------------------------------------------------------------ */

const TODAY = '2026-10-29';
const PUberty = '2004-01-01';

function makeModel(overrides = {}) {
  return Qada.create(
    {
      gender: 'male',
      pubertyDate: PUberty,
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
      ...overrides,
    },
    TODAY,
  );
}

test('the backlog starts at Dhuhr on the day of puberty', () => {
  const model = makeModel();
  assert.equal(model.startIndex, slotIndex(PUberty, 'dhuhr'));

  const expectedDays = dayOfISO(TODAY) - dayOfISO(PUberty);
  const stats = model.stats();
  assert.equal(stats.total, expectedDays * 5 - 1);
  assert.equal(stats.remaining, stats.total);
  assert.equal(model.dayStatus(PUberty), 'missed');
});

test('today plan matches the documented interleaving sequence', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);
  assert.equal(plan.items.length, 5);
  assert.deepEqual(plan.items[0].qada, [
    slotIndex('2004-01-01', 'dhuhr'),
    slotIndex('2004-01-01', 'asr'),
  ]);
  assert.deepEqual(plan.items[1].qada, [
    slotIndex('2004-01-01', 'maghreb'),
    slotIndex('2004-01-01', 'isha'),
  ]);
  assert.deepEqual(plan.items[2].qada, [
    slotIndex('2004-01-02', 'subh'),
    slotIndex('2004-01-02', 'dhuhr'),
  ]);
  assert.deepEqual(plan.items[3].qada, [
    slotIndex('2004-01-02', 'asr'),
    slotIndex('2004-01-02', 'maghreb'),
  ]);
  assert.deepEqual(plan.items[4].qada, [
    slotIndex('2004-01-02', 'isha'),
    slotIndex('2004-01-03', 'subh'),
  ]);
  assert.equal(plan.assigned, 10);
});

test('a plan never assigns the same make-up twice', () => {
  const model = makeModel();
  const today = model.plan(TODAY);
  const seen = new Set();
  for (const item of today.items) {
    for (const index of item.qada) {
      assert.equal(seen.has(index), false, 'duplicate assignment');
      seen.add(index);
    }
  }
  assert.equal(seen.size, 10);

  // Confirming the whole day advances the head by exactly the day's quota.
  for (const item of today.items) {
    model.applyOutcome({
      dateISO: TODAY,
      prayer: item.prayer,
      prayed: true,
      qadaIndices: item.qada,
    });
  }
  const tomorrow = model.plan(addDays(TODAY, 1));
  assert.equal(tomorrow.items[0].qada[0], Math.max(...seen) + 1);
  assert.equal(seen.has(tomorrow.items[0].qada[0]), false);
});

test('praying today consumes its make-ups and shrinks the backlog', () => {
  const model = makeModel();
  const before = model.stats().remaining;
  const plan = model.plan(TODAY);

  model.applyOutcome({
    dateISO: TODAY,
    prayer: 'subh',
    prayed: true,
    qadaIndices: plan.items[0].qada,
  });

  assert.equal(model.get(slotIndex(TODAY, 'subh')), MARK_DONE);
  assert.equal(model.stats().remaining, before - 2);

  const replan = model.plan(TODAY);
  assert.deepEqual(replan.items[0].qada, []);
  assert.deepEqual(replan.items[1].qada, plan.items[1].qada);
  assert.equal(replan.assigned, 8);
});

test('changing the frequency keeps every past mark intact', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);

  // Two weeks at 2 days/day: mark everything for 14 simulated days.
  for (let day = 0; day < 14; day += 1) {
    const dateISO = addDays('2026-10-01', day);
    const dayPlan = model.plan(dateISO);
    for (const item of dayPlan.items) {
      model.applyOutcome({
        dateISO,
        prayer: item.prayer,
        prayed: true,
        qadaIndices: item.qada,
      });
    }
  }

  const doneBefore = model.stats().done;
  const snapshot = Array.from(model.ledger.slice(0, model.startIndex + 200));
  assert.equal(doneBefore, 14 * 10 + 14 * 5);

  // The user now reduces the pace to a single day per day.
  model.setQuota(5);

  assert.equal(model.stats().done, doneBefore, 'history must not change');
  const newPlan = model.plan(TODAY);
  assert.equal(newPlan.quota, 5);
  assert.equal(
    newPlan.items.reduce((sum, item) => sum + item.qada.length, 0),
    5,
  );
  assert.deepEqual(Array.from(model.ledger.slice(0, model.startIndex + 200)), snapshot);

  // And the first unfulfilled make-up is exactly where the 2/day run stopped.
  const expectedNext = slotIndex('2004-01-01', 'dhuhr') + 14 * 10;
  assert.equal(newPlan.items[0].qada[0], expectedNext);
  assert.equal(plan.items[0].qada[0], slotIndex('2004-01-01', 'dhuhr'));
});

test('deferring to tomorrow pauses the rest of today', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);
  model.applyOutcome({ dateISO: TODAY, prayer: 'subh', prayed: true, qadaIndices: plan.items[0].qada });
  model.applyOutcome({ dateISO: TODAY, prayer: 'dhuhr', prayed: true, qadaIndices: plan.items[1].qada });

  const pending = model.plan(TODAY).items[2].qada; // Asr's make-ups, left un-prayed
  model.applyOutcome({
    dateISO: TODAY,
    prayer: 'asr',
    prayed: false,
    defer: 'tomorrow',
  });

  const after = model.plan(TODAY);
  assert.equal(after.pausedMask, 0b11100);
  assert.deepEqual(after.items[2].qada, []);
  assert.deepEqual(after.items[3].qada, []);
  assert.deepEqual(after.items[4].qada, []);

  const remaining = model.stats().remaining;
  const tomorrow = model.plan(addDays(TODAY, 1));
  assert.equal(tomorrow.pausedMask, 0);
  assert.deepEqual(tomorrow.items[0].qada, pending);
  assert.equal(model.stats().remaining, remaining);
});

test('deferring to the next prayer shifts the queue by one slot', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);
  const makeUps = plan.items.flatMap((item) => item.qada);

  model.applyOutcome({ dateISO: TODAY, prayer: 'asr', prayed: false, defer: 'next' });

  const after = model.plan(TODAY);
  assert.equal(after.pausedMask, 0b00100);
  assert.deepEqual(after.items[2].qada, []);
  // Maghreb picks up Asr's leftover make-ups and the rest of the day shifts.
  assert.deepEqual(after.items[3].qada, makeUps.slice(4, 6));
  assert.deepEqual(after.items[4].qada, makeUps.slice(6, 8));
  assert.equal(after.assigned, 8);
  // Two make-ups no longer fit today, so tomorrow starts two earlier.
  assert.equal(model.stats().remaining, plan.remainingBefore);
});

test('a completed prayer stops carrying make-ups', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);
  model.applyOutcome({
    dateISO: TODAY,
    prayer: 'subh',
    prayed: true,
    qadaIndices: plan.items[0].qada,
  });
  const after = model.plan(TODAY);
  assert.deepEqual(after.items[0].qada, []);
  assert.equal(after.assigned, 8);
  assert.equal(model.stats().remaining, plan.remainingBefore - 2);
});

test('partial completion keeps the unconfirmed make-ups at the head', () => {
  const model = makeModel();
  const plan = model.plan(TODAY);
  const [first, second] = plan.items[0].qada;
  model.applyOutcome({
    dateISO: TODAY,
    prayer: 'subh',
    prayed: true,
    qadaIndices: [first],
  });
  const after = model.plan(TODAY);
  assert.equal(model.get(first), MARK_DONE);
  assert.equal(model.get(second), 0);
  assert.deepEqual(after.items[1].qada, [second, plan.items[1].qada[0]]);
});

test('a deferred slot can be resumed', () => {
  const model = makeModel();
  model.applyOutcome({ dateISO: TODAY, prayer: 'maghreb', prayed: false, defer: 'tomorrow' });
  assert.equal(model.plan(TODAY).pausedMask, 0b11000);
  model.clearPause(TODAY);
  assert.equal(model.plan(TODAY).pausedMask, 0);
  assert.equal(model.plan(TODAY).assigned, 10);
});

test('retroactive marking works without touching the plan', () => {
  const model = makeModel();
  const past = '2015-06-15';
  assert.equal(model.dayStatus(past), 'missed');
  model.markRange(past, past, MARK_DONE);
  assert.equal(model.dayStatus(past), 'done');
  // Marking 5 old prayers done reduces the backlog by exactly 5.
  assert.equal(model.stats().done, 5);
});

test('bulk marking a year is bounded by the puberty start and today', () => {
  const model = makeModel();
  const total = model.stats().total;
  const marked = model.markRange('1990-01-01', '2030-01-01', MARK_DONE);
  assert.equal(marked, total);
  assert.equal(model.stats().remaining, 0);
  assert.equal(model.dayStatus('1999-05-05'), 'before');
  assert.equal(model.dayStatus(addDays(TODAY, 1)), 'future');
});

test('exempt days (menstruation) are neither owed nor counted as missed', () => {
  const model = makeModel({ gender: 'female' });
  const before = model.stats().total;
  model.markRange('2020-03-01', '2020-03-05', MARK_EXEMPT);
  assert.equal(model.stats().total, before - 25);
  assert.equal(model.dayStatus('2020-03-02'), 'exempt');
});

test('"praying regularly since" fills the recent backlog', () => {
  const model = makeModel();
  const filled = model.applyRegularSince('2020-01-01');
  assert.ok(filled > 0);
  assert.equal(model.dayStatus('2020-01-01'), 'done');
  assert.equal(model.dayStatus('2019-12-31'), 'missed');
});

test('projection reports a finish date at the current pace', () => {
  const model = makeModel();
  const projection = model.projection();
  assert.equal(projection.quota, 10);
  assert.equal(projection.net, 5);
  assert.ok(projection.finishDate > TODAY);
  assert.ok(projection.yearsAtPace > 5);
});

test('serialisation round-trips through JSON', () => {
  const model = makeModel();
  model.markRange('2010-01-01', '2010-01-31', MARK_DONE);
  model.applyOutcome({ dateISO: TODAY, prayer: 'dhuhr', prayed: false, defer: 'tomorrow' });
  const json = JSON.parse(JSON.stringify(model.toJSON()));
  const restored = Qada.fromJSON(json, TODAY);
  assert.equal(restored.stats().done, model.stats().done);
  assert.equal(restored.stats().remaining, model.stats().remaining);
  assert.equal(restored.plan(TODAY).pausedMask, 0b11110);
  const sizeKb = JSON.stringify(json).length / 1024;
  assert.ok(sizeKb < 120, `backup should stay small, got ${sizeKb.toFixed(1)} kB`);
});

test('a later puberty date removes the earlier obligations', () => {
  const model = makeModel();
  const before = model.stats().total;
  model.updateProfile({ pubertyDate: '2010-01-01' });
  assert.ok(model.stats().total < before);
  assert.equal(model.dayStatus('2009-12-31'), 'before');
});

test('an earlier puberty date adds obligations without touching marks', () => {
  const model = makeModel();
  model.markRange('2004-01-01', '2004-01-31', MARK_DONE);
  const done = model.stats().done;
  model.updateProfile({ pubertyDate: '2000-01-01' });
  assert.equal(model.stats().done, done);
  assert.ok(model.stats().total > 0);
  assert.equal(model.dayStatus('2000-01-01'), 'missed');
});
