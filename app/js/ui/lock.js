/** PIN lock screen shown on cold start when the user enabled the lock. */

import { t } from '../i18n.js';
import { verifyPin } from '../store.js';
import { esc } from './dom.js';
import { icon } from './icons.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function renderLock(app) {
  const value = app.lockPin || '';
  const dots = Array.from(
    { length: 4 },
    (_, i) => `<span class="pin-dot" data-filled="${i < value.length ? 1 : 0}"></span>`,
  ).join('');

  return `
    <div class="lock-screen">
      <span class="brand__mark" style="width:3.6rem;height:3.6rem;border-radius:1.2rem">${icon(
        'lock',
      )}</span>
      <h1 class="onb__title" style="font-size:1.15rem">${esc(t('settings.lock'))}</h1>
      <div class="pin-dots">${dots}</div>
      <div class="pin-pad">
        ${KEYS.map((key) =>
          key === ''
            ? '<span></span>'
            : `<button class="pin-key" data-action="lock-key" data-key="${key}">${esc(key)}</button>`,
        ).join('')}
      </div>
      <button class="btn btn--sm" data-action="lock-forgot" style="margin-top:1rem;opacity:.6">${esc(
        t('settings.reset'),
      )}</button>
    </div>
  `;
}

export const handlers = {
  'lock-key': async (app, el) => {
    const key = el.dataset.key;
    let value = app.lockPin || '';
    if (key === '⌫') value = value.slice(0, -1);
    else if (value.length < 4) value += key;
    app.lockPin = value;

    if (value.length === 4) {
      const ok = await verifyPin(value, app.model.profile.lock);
      if (ok) {
        app.lockPin = '';
        app.unlocked = true;
        app.render();
        return;
      }
      app.lockPin = '';
      app.showToast(t('backup.wrongPassphrase'));
      app.render();
      return;
    }
    app.render();
  },

  'lock-forgot': (app) => {
    app.openSheet('confirm', {
      title: t('settings.reset'),
      body: t('settings.resetHint'),
      confirmLabel: t('common.delete'),
      action: 'do-reset',
      danger: true,
    });
  },
};
