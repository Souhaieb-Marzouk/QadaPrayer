/**
 * Boot smoke test: import the real entry point against a tiny DOM stub and
 * assert that the very first paint is produced without throwing.
 *
 * This exercises the wiring that the per-screen render tests cannot reach
 * (store, clock, router, demo mode, event registration).
 */

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const root = { innerHTML: '' };

function installStubs() {
  globalThis.window = {
    matchMedia: () => ({ matches: true, addEventListener: () => {} }),
    addEventListener: () => {},
    scrollTo: () => {},
    location: { hash: '', search: '' },
  };
  globalThis.location = { hash: '', search: '', reload: () => {} };
  globalThis.history = { replaceState: () => {} };
  globalThis.document = {
    readyState: 'complete',
    getElementById: () => root,
    addEventListener: () => {},
    querySelector: () => null,
    createElement: () => ({ click: () => {}, remove: () => {}, style: {} }),
    body: { appendChild: () => {}, setAttribute: () => {} },
    documentElement: { style: { setProperty: () => {} }, dataset: {}, lang: '', dir: '' },
  };
}

installStubs();
// Other test files in this process install their own DOM stubs; restore ours
// before every test so boot() always targets this file's fake root.
beforeEach(installStubs);
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'en', standalone: false },
  configurable: true,
  writable: true,
});
globalThis.setInterval = () => 0;
globalThis.requestAnimationFrame = (fn) => fn();

const { app, boot } = await import('../app/js/main.js');
const i18n = await import('../app/js/i18n.js');
const { Qada } = await import('../app/js/core/engine.js');

test('first run renders the onboarding wizard', () => {
  assert.equal(app.model, null);
  assert.match(root.innerHTML, /class="onb"/);
});

test('onboarding can be completed and produces a working model', async () => {
  app.onb = {
    step: 7,
    draft: {
      language: 'en',
      gender: 'male',
      pubertyDate: '2004-01-01',
      pubertySource: 'known',
      revertDate: null,
      regularSince: '2019-01-01',
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
      quotaPrayers: 10,
      cityQuery: '',
    },
  };
  const finish = (await import('../app/js/ui/onboarding.js')).handlers['onb-finish'];
  finish(app);

  assert.ok(app.model, 'model created');
  assert.equal(app.model.profile.pubertyDate, '2004-01-01');
  assert.ok(app.model.stats().done > 0, 'regular-since history was applied');
  assert.match(root.innerHTML, /class="app-shell"/);
  assert.match(root.innerHTML, /class="nav"/);
  assert.match(root.innerHTML, /id="app"|class="screen"/);
});

test('today screen renders the five prayers with times after boot', () => {
  assert.ok(app.day, 'prayer times computed');
  assert.match(root.innerHTML, /Subh/);
  assert.match(root.innerHTML, /Isha/);
  assert.ok(app.now >= 0 && app.now < 1440);
});

test('language switch re-renders in Arabic with RTL direction', async () => {
  i18n.setLanguage('ar');
  app.lang = 'ar';
  app.model.profile.language = 'ar';
  app.render();
  assert.match(root.innerHTML, /الصبح/);
  assert.equal(i18n.direction(), 'rtl');
  i18n.setLanguage('en');
  app.lang = 'en';
  app.model.profile.language = 'en';
  app.render();
});

test('a commit persists through the store and re-renders', () => {
  const before = app.model.stats().done;
  app.commit((model) => model.markRange('2010-01-01', '2010-01-03', 1));
  assert.ok(app.model.stats().done > before, 'marks were added');
  assert.equal(app.store.canUndo(), true);
  assert.match(root.innerHTML, /class="app-shell"/);
});

test('undo restores the previous state', () => {
  const before = app.model.stats().done;
  app.commit((model) => model.markRange('2011-02-01', '2011-02-02', 1));
  assert.ok(app.model.stats().done > before);
  const restored = app.store.undo();
  assert.ok(restored);
  assert.equal(restored.stats().done, before);
});

test('routing switches screens', () => {
  for (const route of ['calendar', 'stats', 'settings', 'today']) {
    app.route = route;
    app.render();
    assert.match(root.innerHTML, /class="app-shell"/);
  }
});

test('a fresh model built by the engine survives the store round trip', () => {
  const model = Qada.create(
    {
      pubertyDate: '2000-05-05',
      quotaPrayers: 5,
      location: { name: 'Sfax', country: 'Tunisia', lat: 34.74, lon: 10.76, tz: 'Africa/Tunis' },
    },
    app.today,
  );
  const clone = Qada.fromJSON(JSON.parse(JSON.stringify(model.toJSON())), app.today);
  assert.equal(clone.stats().total, model.stats().total);
});

test('boot() loads a saved model and renders the shell', () => {
  installStubs();
  const serialised = JSON.stringify(app.model.toJSON());
  app.store.storage = {
    getItem: () => serialised,
    setItem: () => {},
    removeItem: () => {},
  };
  boot();
  assert.match(root.innerHTML, /class="app-shell"/);
});
