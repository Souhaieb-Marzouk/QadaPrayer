/**
 * Render tests: every screen must produce valid, complete markup for a
 * realistic model. This catches template regressions (wrong property, missing
 * field, undefined interpolation) without a browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import { computeDay, prayerStateAt } from '../app/js/core/prayerTimes.js';
import { setLanguage } from '../app/js/i18n.js';

// Minimal browser surface used by the render functions.
globalThis.window = {
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  scrollTo: () => {},
  location: { hash: '' },
};
globalThis.document = {
  querySelector: () => null,
  getElementById: () => null,
  addEventListener: () => {},
  documentElement: { style: { setProperty: () => {} }, dataset: {}, lang: '', dir: '' },
  body: { setAttribute: () => {} },
  readyState: 'complete',
};
globalThis.navigator ??= { language: 'en' };
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'en' },
  configurable: true,
  writable: true,
});

const { default: _unused } = { default: null };

const todayScreens = await import('../app/js/ui/today.js');
const calendarScreens = await import('../app/js/ui/calendar.js');
const statsScreens = await import('../app/js/ui/stats.js');
const settingsScreens = await import('../app/js/ui/settings.js');
const sheetScreens = await import('../app/js/ui/sheets.js');
const onboarding = await import('../app/js/ui/onboarding.js');
const lockScreen = await import('../app/js/ui/lock.js');

const TODAY = '2026-10-29';

function buildApp(overrides = {}) {
  const model = Qada.create(
    {
      gender: 'male',
      pubertyDate: '2004-01-01',
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  model.markRange('2004-01-01', '2007-06-30', 1);
  model.setMark(TODAY, 'subh', 1);

  const app = {
    model,
    today: TODAY,
    now: 15 * 60 + 20,
    lang: 'en',
    store: { meta: {}, canUndo: () => true },
    cal: { year: 2026, month: null },
    sheet: null,
    onb: null,
    lockPin: '',
    demo: false,
    installPrompt: null,
    day: computeDay({
      dateISO: TODAY,
      lat: 36.8065,
      lon: 10.1815,
      tz: 'Africa/Tunis',
      method: 'tunisia',
    }),
    commit: (fn) => fn(model),
    render: () => {},
    openSheet: () => {},
    closeSheet: () => {},
    showToast: () => {},
    refreshClock: () => {},
    applyVisualPreferences: () => {},
    ...overrides,
  };
  return app;
}

const forbidden = ['undefined', 'NaN', '[object Object]', 'null<'];

function assertClean(html, label) {
  assert.ok(html.length > 200, `${label} produced too little markup`);
  for (const bad of forbidden) {
    assert.equal(html.includes(bad), false, `${label} contains "${bad}"`);
  }
  // crude tag balance check for the elements we generate
  const opens = (html.match(/<div\b/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, `${label} has unbalanced <div> tags`);
}

for (const language of ['en', 'fr', 'ar']) {
  setLanguage(language);

  test(`today screen renders in ${language}`, () => {
    const app = buildApp();
    const html = todayScreens.render(app);
    assertClean(html, 'today');
    assert.match(html, /class="hero"/);
    assert.equal((html.match(/class="prayer"/g) || []).length, 5);
  });

  test(`calendar renders in ${language}`, () => {
    const app = buildApp();
    const yearView = calendarScreens.render(app);
    assertClean(yearView, 'calendar-year');
    assert.match(yearView, /class="month-card"/);

    app.cal.month = 4;
    app.cal.year = 2010;
    const monthView = calendarScreens.render(app);
    assertClean(monthView, 'calendar-month');
    assert.match(monthView, /class="cal-cell"/);
  });

  test(`stats renders in ${language}`, () => {
    const app = buildApp();
    const html = statsScreens.render(app);
    assertClean(html, 'stats');
    assert.match(html, /class="bar-chart"/);
    assert.match(html, /class="milestone"/);
  });

  test(`settings renders in ${language}`, () => {
    const app = buildApp();
    const html = settingsScreens.render(app);
    assertClean(html, 'settings');
    assert.match(html, /id="puberty-input"/);
  });

  test(`every sheet renders in ${language}`, () => {
    const app = buildApp();
    const cases = [
      { type: 'prayer', date: TODAY, prayer: 'asr', checked: ['self'] },
      { type: 'defer', date: TODAY, prayer: 'asr', pending: [1, 2] },
      { type: 'day', date: '2012-04-18' },
      { type: 'bulk', from: '2004-01-01', to: '2026-10-28', mode: 'done' },
      { type: 'city', query: 'tun' },
      { type: 'backup', passphrase: '' },
      { type: 'confirm', title: 'Test', body: 'Test body', action: 'noop' },
      { type: 'pin', mode: 'set', value: '12' },
      { type: 'support' },
    ];
    for (const sheet of cases) {
      app.sheet = sheet;
      const html = sheetScreens.renderSheet(app);
      assertClean(html, `sheet:${sheet.type}`);
    }
  });
}

test('onboarding renders every step', () => {
  setLanguage('en');
  const app = buildApp();
  app.model = null;
  const baseDraft = {
    language: 'en',
    gender: 'male',
    pubertyDate: '2004-01-01',
    pubertySource: 'known',
    revertDate: null,
    regularSince: null,
    location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    quotaPrayers: 10,
    cityQuery: '',
  };
  for (let step = 0; step < 8; step += 1) {
    app.onb = { step, draft: { ...baseDraft } };
    const html = onboarding.render(app);
    assertClean(html, `onboarding:${step}`);
    assert.ok(html.includes('onb__body'));
  }
});

test('lock screen renders', () => {
  setLanguage('en');
  const app = buildApp();
  app.model.profile.lock = { enabled: true, hash: 'x', salt: 'y' };
  app.lockPin = '12';
  const html = lockScreen.renderLock(app);
  assertClean(html, 'lock');
  assert.match(html, /class="pin-pad"/);
});

test('the plan shown in the UI matches the engine plan', () => {
  setLanguage('en');
  const app = buildApp();
  const html = todayScreens.render(app);
  const plan = app.model.plan(TODAY);
  const head = app.model.firstUndone(app.model.startIndex, app.model.backlogEnd(TODAY), 1)[0];
  const firstWithQada = plan.items.find((item) => item.qada.length > 0);
  assert.equal(firstWithQada.qada[0], head);
  assert.ok(html.includes('qada'), 'make-up chips missing');
});

test('deferral state is reflected in the today screen', () => {
  setLanguage('en');
  const app = buildApp();
  app.model.applyOutcome({ dateISO: TODAY, prayer: 'asr', prayed: false, defer: 'tomorrow' });
  const html = todayScreens.render(app);
  assert.match(html, /data-action="resume-today"/);
});

test('prayer state helper picks the right obligation', () => {
  const app = buildApp();
  assert.equal(prayerStateAt(app.day, app.day.times.asr + 2).current, 'asr');
  assert.equal(prayerStateAt(app.day, app.day.times.maghreb + 2).current, 'maghreb');
});
