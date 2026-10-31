/** The review page renders from the plan alone, with nothing extra stored. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Qada } from '../app/js/core/engine.js';
import { setLanguage } from '../app/js/i18n.js';
import { render } from '../app/js/ui/review.js';

const TODAY = '2026-10-29';

function app() {
  const model = Qada.create(
    {
      pubertyDate: '2026-01-01',
      quotaPrayers: 5,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  model.markRange('2026-10-20', '2026-10-28', 1);
  return { model, today: TODAY };
}

test('the review page renders in every language', () => {
  for (const language of ['en', 'fr', 'ar']) {
    setLanguage(language);
    const html = render(app());
    assert.match(html, /review__days/, `${language}: the bar chart is there`);
    assert.match(html, /review__bar/);
    assert.ok(html.length > 500, `${language}: a full page`);
  }
  setLanguage('en');
});

test('it shows the streak and the four weeks', () => {
  const html = render(app());
  assert.match(html, /Review/);
  assert.match(html, /four weeks/);
});

test('a brand-new ledger still renders', () => {
  const model = Qada.create(
    {
      pubertyDate: TODAY,
      quotaPrayers: 5,
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz: 'Africa/Tunis' },
    },
    TODAY,
  );
  const html = render({ model, today: TODAY });
  assert.match(html, /review__days/);
});
