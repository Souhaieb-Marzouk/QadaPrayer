/**
 * Multi-profile document: migration from the single-user format, and the
 * operations the People screen relies on.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import {
  DOC_VERSION,
  MAX_PROFILES,
  activeData,
  activeProfile,
  addProfile,
  isEmpty,
  normalizeDoc,
  removeProfile,
  renameProfile,
  setActiveData,
  switchTo,
  wrapState,
} from '../app/js/profiles.js';

const TODAY = '2026-10-29';

function state(marks = 0) {
  const model = Qada.create(
    {
      pubertyDate: '2004-01-01',
      quotaPrayers: 5,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  if (marks > 0) model.markRange('2004-01-01', '2004-01-03', 1);
  return model.toJSON();
}

/* ------------------------------------------------------------------ */
/* Migration                                                           */
/* ------------------------------------------------------------------ */

test('a legacy single-user state becomes a one-profile document', () => {
  const legacy = state();
  const doc = normalizeDoc(legacy, 'Souhaieb');

  assert.equal(doc.v, DOC_VERSION);
  assert.equal(doc.profiles.length, 1);
  assert.equal(doc.profiles[0].name, 'Souhaieb');
  assert.equal(doc.activeId, doc.profiles[0].id);
  assert.deepEqual(doc.profiles[0].data, legacy);
});

test('a legacy state still opens with its marks intact', () => {
  const legacy = state(1);
  const doc = normalizeDoc(legacy, 'Me');
  const model = Qada.fromJSON(activeData(doc), TODAY);

  assert.equal(model.stats().done, 14);
  assert.equal(model.profile.pubertyDate, '2004-01-01');
});

test('a document survives a round trip', () => {
  const doc = normalizeDoc(state(), 'A');
  const again = normalizeDoc(JSON.parse(JSON.stringify(doc)), 'B');

  assert.equal(again.profiles.length, 1);
  assert.equal(again.profiles[0].name, 'A');
  assert.equal(again.activeId, doc.activeId);
});

test('garbage is refused instead of crashing', () => {
  assert.equal(normalizeDoc(null), null);
  assert.equal(normalizeDoc('nope'), null);
  assert.equal(normalizeDoc({ hello: 1 }), null);
  assert.equal(normalizeDoc({ v: 2, profiles: [] }), null);
});

test('an unknown activeId falls back to the first profile', () => {
  const doc = normalizeDoc(state(), 'A');
  doc.activeId = 'gone';
  const fixed = normalizeDoc(JSON.parse(JSON.stringify(doc)), 'A');
  assert.equal(fixed.activeId, fixed.profiles[0].id);
});

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

test('wrapState names the first profile', () => {
  const doc = wrapState(state(), 'Omrani');
  assert.equal(activeProfile(doc).name, 'Omrani');
  assert.equal(isEmpty(doc), false);
});

test('switching changes the active profile only', () => {
  const doc = normalizeDoc(state(), 'A');
  addProfile(doc, 'B', state(1));
  const bId = doc.activeId;
  const first = doc.profiles[0].id;

  switchTo(doc, first);
  assert.equal(doc.activeId, first);
  assert.equal(doc.profiles.length, 2);
  assert.equal(Qada.fromJSON(activeData(doc), TODAY).stats().done, 0);

  switchTo(doc, bId);
  assert.equal(Qada.fromJSON(activeData(doc), TODAY).stats().done, 14);
});

test('switching to an unknown id does nothing', () => {
  const doc = normalizeDoc(state(), 'A');
  const before = doc.activeId;
  switchTo(doc, 'nope');
  assert.equal(doc.activeId, before);
});

test('adding a profile makes it active', () => {
  const doc = normalizeDoc(state(), 'A');
  const before = doc.profiles.length;
  addProfile(doc, 'B', state());

  assert.equal(doc.profiles.length, before + 1);
  assert.equal(activeProfile(doc).name, 'B');
});

test('the number of profiles is capped', () => {
  const doc = normalizeDoc(state(), 'A');
  while (doc.profiles.length < MAX_PROFILES) addProfile(doc, `P${doc.profiles.length}`, state());
  assert.throws(() => addProfile(doc, 'one too many', state()), /too-many-profiles/);
});

test('removing a profile keeps at least one', () => {
  const doc = normalizeDoc(state(), 'A');
  removeProfile(doc, doc.profiles[0].id);
  assert.equal(doc.profiles.length, 1, 'the last profile cannot be removed');
});

test('removing the active profile picks another', () => {
  const doc = normalizeDoc(state(), 'A');
  const first = doc.profiles[0].id;
  addProfile(doc, 'B', state());
  const second = activeProfile(doc).id;

  removeProfile(doc, second);
  assert.equal(doc.profiles.length, 1);
  assert.equal(doc.activeId, first);
});

test('renaming only touches that profile', () => {
  const doc = normalizeDoc(state(), 'A');
  addProfile(doc, 'B', state());
  const a = doc.profiles[0].id;
  renameProfile(doc, a, 'Ahmed');
  assert.equal(doc.profiles[0].name, 'Ahmed');
  assert.equal(doc.profiles[1].name, 'B');
});

test('setActiveData writes only the active ledger', () => {
  const doc = normalizeDoc(state(), 'A');
  addProfile(doc, 'B', state());
  const bId = doc.activeId;

  setActiveData(doc, state(1));
  const aData = doc.profiles.find((entry) => entry.id !== bId).data;
  const bData = doc.profiles.find((entry) => entry.id === bId).data;

  assert.equal(Qada.fromJSON(aData, TODAY).stats().done, 0);
  assert.equal(Qada.fromJSON(bData, TODAY).stats().done, 14);
});


