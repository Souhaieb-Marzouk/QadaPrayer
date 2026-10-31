/**
 * The Android widget bridge: what the page pushes, and that it stays harmless
 * when there is no native shell (every browser).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import { computeDay } from '../app/js/core/prayerTimes.js';
import { setLanguage } from '../app/js/i18n.js';
import { buildSnapshot, hasNativeBridge, publishSnapshot } from '../app/js/native.js';

const TODAY = '2026-10-29';

function fixture() {
  const model = Qada.create(
    {
      pubertyDate: '2004-01-01',
      quotaPrayers: 10,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  model.setMark(TODAY, 'subh', 1);
  model.setMark(TODAY, 'dhuhr', 1);

  const day = computeDay({
    dateISO: TODAY,
    lat: 36.8065,
    lon: 10.1815,
    tz: 'Africa/Tunis',
    method: 'tunisia',
  });

  return { model, day };
}

test('the snapshot carries the three widget strings', () => {
  setLanguage('en');
  const { model, day } = fixture();
  const snapshot = buildSnapshot({ today: TODAY, day, model, now: 900 });

  assert.ok(snapshot);
  assert.match(snapshot.headline, /2\/5/);
  assert.match(snapshot.big, /\d/);
  assert.match(snapshot.next, /·/);
  assert.equal(typeof snapshot.remaining, 'number');
  assert.equal(snapshot.remaining, model.stats().remaining);
});

test('the snapshot is localised', () => {
  const { model, day } = fixture();
  const results = new Set();
  for (const language of ['en', 'fr', 'ar']) {
    setLanguage(language);
    results.add(buildSnapshot({ today: TODAY, day, model, now: 900 }).headline);
  }
  assert.equal(results.size, 3, 'each language should produce its own label');
  setLanguage('en');
});

test('the snapshot follows the current prayer', () => {
  const { model, day } = fixture();
  const before = buildSnapshot({ today: TODAY, day, model, now: day.windows.subh.start + 5 });
  const after = buildSnapshot({ today: TODAY, day, model, now: day.windows.asr.start + 5 });
  assert.notEqual(before.next, after.next);
});

test('no snapshot without a model', () => {
  assert.equal(buildSnapshot({ today: TODAY, day: null, model: null, now: 0 }), null);
});

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

test('publishing is a no-op in a plain browser', () => {
  globalThis.window = {};
  assert.equal(hasNativeBridge(), false);
  assert.equal(publishSnapshot({ headline: 'x', big: '1', next: 'y' }), false);
});

test('publishing forwards JSON to the native bridge', () => {
  let received = null;
  globalThis.window = {
    QadaNative: {
      publish: (json) => {
        received = json;
      },
    },
  };

  assert.equal(hasNativeBridge(), true);
  const ok = publishSnapshot({ headline: 'Today 2/5', big: '1200', next: 'Next Asr · 15:02' });
  assert.equal(ok, true);
  assert.deepEqual(JSON.parse(received), {
    headline: 'Today 2/5',
    big: '1200',
    next: 'Next Asr · 15:02',
  });
});

test('a throwing bridge never escapes', () => {
  globalThis.window = {
    QadaNative: {
      publish: () => {
        throw new Error('boom');
      },
    },
  };
  assert.equal(publishSnapshot({ headline: 'x', big: '1', next: 'y' }), false);
});
