/**
 * Export surfaces: the CSV ledger, the per-year summary, the Hijri date and the
 * printable plan.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import { hijriDate, setLanguage } from '../app/js/i18n.js';
import { exportName, ledgerCsv, summaryByYear } from '../app/js/exporter.js';

const TODAY = '2026-10-29';

function model() {
  const instance = Qada.create(
    {
      pubertyDate: '2004-01-01',
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  // 2004 fully done, 2005 untouched, 2006 half done.
  instance.markRange('2004-01-01', '2004-12-31', 1);
  instance.markRange('2006-01-01', '2006-06-30', 1);
  return instance;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

test('the CSV starts with a header and one row per owed prayer', () => {
  const instance = model();
  const csv = ledgerCsv(instance, { today: TODAY });
  const lines = csv.trimEnd().split('\n');

  assert.equal(lines[0], 'date,prayer,status');
  assert.equal(lines.length - 1, instance.stats().total);
  for (const line of lines.slice(1)) {
    assert.match(line, /^\d{4}-\d{2}-\d{2},(subh|dhuhr|asr|maghreb|isha),(prayed|missed|exempt)$/);
  }
});

test('the CSV rows carry the real status', () => {
  const instance = model();
  const rows = new Set(ledgerCsv(instance, { today: TODAY }).trimEnd().split('\n').slice(1));

  assert.equal(rows.has('2004-03-01,dhuhr,prayed'), true);
  assert.equal(rows.has('2005-03-01,dhuhr,missed'), true);
  assert.equal(rows.has('2006-03-01,dhuhr,prayed'), true);
  assert.equal(rows.has('2006-07-01,dhuhr,missed'), true);
});

test('exempt slots are exported as exempt, not missed', () => {
  const instance = model();
  instance.markRange('2005-02-01', '2005-02-05', 2);
  const rows = new Set(ledgerCsv(instance, { today: TODAY }).trimEnd().split('\n').slice(1));
  assert.equal(rows.has('2005-02-02,asr,exempt'), true);
  assert.equal(rows.has('2005-02-02,asr,missed'), false);
});

test('the ledger never starts before Dhuhr of the puberty day', () => {
  const instance = model();
  const first = ledgerCsv(instance, { today: TODAY }).split('\n')[1];
  assert.match(first, /^2004-01-01,dhuhr,/);
});

/* ------------------------------------------------------------------ */
/* Yearly summary                                                      */
/* ------------------------------------------------------------------ */

test('the yearly summary adds up to the global numbers', () => {
  const instance = model();
  const stats = instance.stats();
  const years = summaryByYear(instance, { today: TODAY });

  const owed = years.reduce((sum, y) => sum + y.owed, 0);
  const done = years.reduce((sum, y) => sum + y.done, 0);

  assert.equal(owed, stats.total);
  assert.equal(done, stats.done);
  assert.ok(years.every((entry) => entry.remaining === entry.owed - entry.done));
  assert.ok(years.every((entry) => entry.remaining >= 0));
});

test('the yearly summary is ordered and starts at the puberty year', () => {
  const years = summaryByYear(model(), { today: TODAY });
  assert.equal(years[0].year, 2004);
  for (let i = 1; i < years.length; i += 1) {
    assert.ok(years[i].year > years[i - 1].year);
  }
});

/* ------------------------------------------------------------------ */
/* File name                                                           */
/* ------------------------------------------------------------------ */

test('export names are lower-case and filesystem safe', () => {
  const instance = model();
  const name = exportName(instance, 'ledger', TODAY);
  assert.equal(name, 'qada-tunis-2026-10-29-ledger');
  assert.match(name, /^[a-z0-9-]+$/);
});

/* ------------------------------------------------------------------ */
/* Hijri date                                                          */
/* ------------------------------------------------------------------ */

test('the Hijri date is computed for all three languages', () => {
  for (const language of ['en', 'fr', 'ar']) {
    setLanguage(language);
    const value = hijriDate('2026-10-29');
    assert.ok(value.length > 0, `${language}: empty Hijri date`);
    assert.match(value, /1448/, `${language}: expected year 1448, got "${value}"`);
  }
  setLanguage('en');
});

/* ------------------------------------------------------------------ */
/* Printable plan                                                      */
/* ------------------------------------------------------------------ */

test('the printable plan renders in three languages', async () => {
  globalThis.window = { matchMedia: () => ({ matches: false }), print: () => {} };
  globalThis.document = {
    querySelector: () => null,
    getElementById: () => null,
    addEventListener: () => {},
    documentElement: { style: { setProperty: () => {} }, dataset: {} },
    body: { setAttribute: () => {} },
  };

  const print = await import('../app/js/ui/print.js');
  const instance = model();

  for (const language of ['en', 'fr', 'ar']) {
    setLanguage(language);
    const html = print.render({ model: instance, today: TODAY, day: { windows: {} } });
    assert.match(html, /class="print-page"/);
    assert.match(html, /class="print-table"/);
    assert.equal(html.includes('undefined'), false, `${language}: undefined leaked`);
    const rows = (html.match(/<tr>/g) || []).length;
    assert.ok(rows >= 22, `${language}: expected a row per year, got ${rows}`);
  }
  setLanguage('en');
});
