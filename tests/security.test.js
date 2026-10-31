/** Audit checks: hostile input, the CSP and the endpoint policy. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Qada } from '../app/js/core/engine.js';
import { ledgerCsv } from '../app/js/exporter.js';

const TODAY = '2026-10-29';

function base(overrides = {}) {
  return {
    v: 1,
    profile: {
      gender: 'male',
      pubertyDate: '2004-01-01',
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8, lon: 10.18, tz: 'Africa/Tunis' },
      ...overrides.profile,
    },
    marks: [],
    pauses: {},
    log: [],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Hostile input                                                       */
/* ------------------------------------------------------------------ */

test('a __proto__ key in pauses cannot poison the object', () => {
  const raw = JSON.parse('{"v":1,"profile":{"pubertyDate":"2004-01-01"},"marks":[],"pauses":{"__proto__":{"polluted":true}},"log":[]}');
  const model = Qada.fromJSON(raw, TODAY);

  assert.equal({}.polluted, undefined, 'Object.prototype is untouched');
  assert.deepEqual(model.data.pauses, {});
});

test('a hostile pauses object keeps only real dates and 5-bit masks', () => {
  const raw = base({
    pauses: { '2026-10-01': 3, 'not-a-date': 1, '2026-10-02': 999, '2026-10-03': -1 },
  });
  const model = Qada.fromJSON(raw, TODAY);

  assert.deepEqual(model.data.pauses, { '2026-10-01': 3 });
});

test('an absurd ledger is clamped instead of exhausting memory', () => {
  const marks = [];
  const count = 250000;
  for (let index = 0; index < count; index += 1) marks.push([1, 1000000]);

  const started = Date.now();
  const model = Qada.fromJSON(base({ marks }), TODAY);
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 4000, `took ${elapsed}ms`);
  assert.ok(model.ledger.length <= 400000, 'the ledger is capped');
});

test('a nonsense profile is repaired, not trusted', () => {
  const raw = base({
    profile: {
      pubertyDate: 'not-a-date',
      theme: '<script>',
      numerals: 'roman',
      method: 'rm -rf /',
      location: { name: 'x'.repeat(500), lat: 999, lon: -999, tz: 'Mars/Olympus' },
    },
  });
  const model = Qada.fromJSON(raw, TODAY);

  assert.equal(model.profile.pubertyDate, null);
  assert.ok(['dark', 'light', 'sepia', 'night', 'auto'].includes(model.profile.theme));
  assert.ok(['auto', 'arabic'].includes(model.profile.numerals));
  assert.ok(model.profile.location.name.length <= 80);
  assert.ok(model.profile.location.lat <= 90 && model.profile.location.lat >= -90);
  assert.ok(model.profile.location.lon <= 180 && model.profile.location.lon >= -180);
  assert.equal(model.profile.location.tz, 'Africa/Tunis');
});

test('the two newer themes survive a save and reload', () => {
  const model = Qada.create(
    {
      pubertyDate: '2004-01-01',
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8, lon: 10.18, tz: 'Africa/Tunis' },
      theme: 'sepia',
    },
    TODAY,
  );

  const reloaded = Qada.fromJSON(JSON.parse(JSON.stringify(model.toJSON())), TODAY);
  assert.equal(reloaded.profile.theme, 'sepia');
});

test('a non-object backup is refused with a clear error', () => {
  assert.throws(() => Qada.fromJSON(null, TODAY));
  assert.throws(() => Qada.fromJSON('nope', TODAY));
});

test('a future version is refused rather than half-read', () => {
  assert.throws(() => Qada.fromJSON({ v: 99, profile: {}, marks: [] }, TODAY), /newer version/);
});

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

test('the CSV has one row per owed slot and no injected formulas', () => {
  const model = Qada.create(
    {
      pubertyDate: '2026-10-20',
      location: { name: '=cmd|calc', lat: 36.8, lon: 10.18, tz: 'Africa/Tunis' },
    },
    TODAY,
  );

  const csv = ledgerCsv(model, { today: TODAY });
  const lines = csv.trim().split('\n');

  assert.equal(lines[0], 'date,prayer,status');
  assert.ok(lines.length > 1);
  assert.ok(!csv.includes('=cmd'), 'no user text reaches the CSV');
  for (const line of lines.slice(1)) {
    assert.match(line, /^\d{4}-\d{2}-\d{2},[a-z]+,(done|missed|exempt)$/);
  }
});

/* ------------------------------------------------------------------ */
/* Transport policy                                                    */
/* ------------------------------------------------------------------ */

test('the app ships a content security policy', () => {
  const html = readFileSync('app/index.html', 'utf8');

  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'none'/);
  assert.match(html, /frame-ancestors 'self'/);
});

test('no remote script, no inline handler in the shell', () => {
  const html = readFileSync('app/index.html', 'utf8');

  assert.ok(!/src="https?:\/\//.test(html), 'no third-party script');
  assert.ok(!/\son(click|load|error)=/i.test(html), 'no inline handlers');
});

test('every external link opens without an opener', () => {
  const files = ['app/js/ui/settings.js', 'app/js/ui/sheets.js'];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const targets = source.match(/target="_blank"/g) || [];
    const noopener = source.match(/rel="noopener noreferrer"/g) || [];
    assert.ok(noopener.length >= 1 || targets.length === 0, `${file}: rel is missing`);
  }
});
