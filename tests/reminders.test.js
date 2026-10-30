/**
 * Reminder scheduling rules.
 *
 * The delivery layer needs a browser, but *when* a reminder is due must be
 * provable: these tests pin the quiet-hours behaviour, lead times, the evening
 * nudge and the overnight Subh.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_REMINDERS,
  buildSchedule,
  inQuietHours,
  normalizeReminders,
} from '../app/js/core/reminders.js';

const WINDOWS = {
  subh: { start: 313, end: 400 },
  dhuhr: { start: 724, end: 902 },
  asr: { start: 902, end: 1046 },
  maghreb: { start: 1046, end: 1128 },
  isha: { start: 1128, end: 1740 },
};

const TODAY = '2026-10-29';
const TOMORROW = '2026-10-30';

function settings(patch = {}) {
  return { ...DEFAULT_REMINDERS, enabled: true, ...patch };
}

function build(patch = {}, extra = {}) {
  return buildSchedule({
    days: [{ dateISO: TODAY, windows: WINDOWS }],
    nowMinutes: 300,
    settings: settings(patch),
    remaining: 1200,
    ...extra,
  });
}

/* ------------------------------------------------------------------ */
/* quiet hours                                                         */
/* ------------------------------------------------------------------ */

test('quiet hours wrap around midnight', () => {
  assert.equal(inQuietHours(60, 23 * 60, 5 * 60), true); // 01:00
  assert.equal(inQuietHours(23 * 60 + 30, 23 * 60, 5 * 60), true); // 23:30
  assert.equal(inQuietHours(12 * 60, 23 * 60, 5 * 60), false); // midday
  assert.equal(inQuietHours(5 * 60, 23 * 60, 5 * 60), false); // 05:00 is the end
});

test('a non-wrapping quiet window works too', () => {
  assert.equal(inQuietHours(13 * 60, 12 * 60, 14 * 60), true);
  assert.equal(inQuietHours(15 * 60, 12 * 60, 14 * 60), false);
});

test('equal bounds mean "no quiet hours"', () => {
  assert.equal(inQuietHours(600, 8 * 60, 8 * 60), false);
});

/* ------------------------------------------------------------------ */
/* settings normalisation                                              */
/* ------------------------------------------------------------------ */

test('settings are clamped to sane values', () => {
  const config = normalizeReminders({ lead: 999, qadaHour: -4, quietFrom: 40, quietTo: -1 });
  assert.equal(config.lead, 45);
  assert.equal(config.qadaHour, 0);
  assert.equal(config.quietFrom, 23);
  assert.equal(config.quietTo, 0);
});

test('missing settings fall back to the defaults', () => {
  const config = normalizeReminders(undefined);
  assert.equal(config.enabled, false);
  assert.equal(config.subh, true);
  assert.equal(config.lead, 0);
});

/* ------------------------------------------------------------------ */
/* schedule                                                            */
/* ------------------------------------------------------------------ */

test('a disabled schedule produces nothing', () => {
  assert.deepEqual(build({ enabled: false }), []);
});

test('one reminder per enabled prayer, in time order', () => {
  const events = build();
  const prayers = events.filter((event) => event.kind === 'prayer');
  assert.equal(prayers.length, 5);
  assert.deepEqual(
    prayers.map((event) => event.prayer),
    ['subh', 'dhuhr', 'asr', 'maghreb', 'isha'],
  );
  for (let i = 1; i < prayers.length; i += 1) {
    assert.ok(prayers[i].delayMinutes > prayers[i - 1].delayMinutes);
  }
  // Subh at 05:13, now 05:00 → 13 minutes away.
  assert.equal(prayers[0].delayMinutes, 13);
});

test('a reminder already in the past is skipped', () => {
  const events = buildSchedule({
    days: [{ dateISO: TODAY, windows: WINDOWS }],
    nowMinutes: 800, // after Dhuhr
    settings: settings(),
    remaining: 0,
  });
  assert.deepEqual(
    events.map((event) => event.prayer),
    ['asr', 'maghreb', 'isha'],
  );
});

test('disabling one prayer removes only that reminder', () => {
  const events = build({ dhuhr: false });
  assert.equal(events.some((event) => event.prayer === 'dhuhr'), false);
  assert.equal(events.filter((event) => event.kind === 'prayer').length, 4);
});

test('the lead time shifts every prayer earlier', () => {
  const onTime = build();
  const early = build({ lead: 10 });
  const first = onTime.find((event) => event.prayer === 'subh');
  const shifted = early.find((event) => event.prayer === 'subh');
  assert.equal(shifted.delayMinutes, first.delayMinutes - 10);
});

test('a lead time never produces a negative time', () => {
  const events = buildSchedule({
    days: [{ dateISO: TODAY, windows: { ...WINDOWS, subh: { start: 4, end: 60 } } }],
    nowMinutes: 0,
    settings: settings({ lead: 15 }),
    remaining: 0,
  });
  for (const event of events) assert.ok(event.atMinutes >= 0, 'negative reminder time');
  assert.equal(events.some((event) => event.prayer === 'subh'), false);
});

test('the evening nudge appears once and carries the remaining count', () => {
  const events = build({ qadaHour: 20 });
  const nudge = events.filter((event) => event.kind === 'qada');
  assert.equal(nudge.length, 1);
  assert.equal(nudge[0].remaining, 1200);
  assert.equal(nudge[0].delayMinutes, 20 * 60 - 300);
});

test('no evening nudge when nothing is owed', () => {
  const events = build({}, { remaining: 0 });
  assert.equal(events.some((event) => event.kind === 'qada'), false);
});

test('the evening nudge respects quiet hours', () => {
  const events = build({ qadaHour: 2 });
  assert.equal(events.some((event) => event.kind === 'qada'), false);
});

test('tomorrow is scheduled across midnight', () => {
  const events = buildSchedule({
    days: [
      { dateISO: TODAY, windows: WINDOWS },
      { dateISO: TOMORROW, windows: WINDOWS },
    ],
    nowMinutes: 300,
    settings: settings({ qada: false }),
    remaining: 0,
  });
  const tomorrowSubh = events.find((event) => event.dateISO === TOMORROW && event.prayer === 'subh');
  assert.ok(tomorrowSubh);
  assert.equal(tomorrowSubh.delayMinutes, 313 + 1440 - 300);
});

test('keys are unique so a reminder can never be shown twice', () => {
  const events = buildSchedule({
    days: [
      { dateISO: TODAY, windows: WINDOWS },
      { dateISO: TOMORROW, windows: WINDOWS },
    ],
    nowMinutes: 0,
    settings: settings(),
    remaining: 10,
  });
  const keys = new Set(events.map((event) => event.key));
  assert.equal(keys.size, events.length);
});

test('the queue is capped and sorted', () => {
  const events = buildSchedule({
    days: [
      { dateISO: TODAY, windows: WINDOWS },
      { dateISO: TOMORROW, windows: WINDOWS },
    ],
    nowMinutes: 0,
    settings: settings(),
    remaining: 10,
    limit: 3,
  });
  assert.equal(events.length, 3);
  for (let i = 1; i < events.length; i += 1) {
    assert.ok(events[i].delayMinutes >= events[i - 1].delayMinutes);
  }
});

test('missing day windows are tolerated', () => {
  const events = buildSchedule({
    days: [{ dateISO: TODAY, windows: {} }],
    nowMinutes: 0,
    settings: settings(),
    remaining: 0,
  });
  assert.deepEqual(events, []);
});

/* ------------------------------------------------------------------ */
/* settings UI                                                         */
/* ------------------------------------------------------------------ */

test('the settings screen exposes the reminder controls when enabled', async () => {
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    scrollTo: () => {},
    location: { hash: '', search: '' },
  };
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: () => {},
    documentElement: { style: { setProperty: () => {} }, dataset: {} },
    body: { setAttribute: () => {} },
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'en' },
    configurable: true,
    writable: true,
  });

  const { Qada } = await import('../app/js/core/engine.js');
  const { setLanguage } = await import('../app/js/i18n.js');
  const settingsUi = await import('../app/js/ui/settings.js');

  for (const language of ['en', 'fr', 'ar']) {
    setLanguage(language);
    const model = Qada.create(
      {
        pubertyDate: '2004-01-01',
        quotaPrayers: 5,
        notifications: { enabled: true, lead: 5, qadaHour: 20 },
        location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
      },
      TODAY,
    );
    const app = {
      model,
      today: TODAY,
      day: { windows: {} },
      lang: language,
      store: { meta: {} },
      cal: { year: 2026, month: null },
      installPrompt: null,
    };
    const html = settingsUi.render(app);
    assert.match(html, /data-action="rem-toggle"/);
    assert.match(html, /data-action="rem-lead"/);
    assert.match(html, /data-action="rem-test"/);
    assert.equal((html.match(/data-key="subh"/g) || []).length, 1);
    assert.equal(html.includes('undefined'), false, `${language}: undefined leaked`);
  }
  setLanguage('en');
});
