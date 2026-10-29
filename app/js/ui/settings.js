/** Settings: everything the user can change, without ever touching history. */

import { t, number, dateMedium, setLanguage as setI18nLanguage } from '../i18n.js';
import { PRAYERS } from '../core/dates.js';
import { esc, signed } from './dom.js';
import { icon } from './icons.js';
import { LINKS, METHOD_LABELS, VERSION, supportsConfigured } from '../config.js';
import { METHOD_IDS } from '../core/prayerTimes.js';

function card(title, body) {
  return `
    <div class="section-title"><h2>${esc(title)}</h2></div>
    <div class="card">${body}</div>`;
}

function row({ label, value, action, iconName, hint }) {
  return `
    <button class="list__row list__row--nav" data-action="${action}">
      ${iconName ? icon(iconName) : ''}
      <span class="list__label">${esc(label)}${
        hint ? `<span class="field__hint" style="display:block">${esc(hint)}</span>` : ''
      }</span>
      <span class="list__value">${esc(value)}</span>
    </button>`;
}

function segmented(options, current, action) {
  return `
    <div class="segmented">
      ${options
        .map(
          ([value, label]) => `
        <button class="segmented__btn" data-action="${action}" data-value="${value}"
          aria-pressed="${String(current) === String(value)}">${esc(label)}</button>`,
        )
        .join('')}
    </div>`;
}

function stepper({ label, value, action, min, max, extra = '', suffix = '' }) {
  return `
    <div class="stepper">
      <span class="list__label">${esc(label)}</span>
      <span class="stepper__controls">
        <button class="stepper__btn" data-action="${action}" ${extra} data-delta="-1" ${
          value <= min ? 'disabled' : ''
        }>−</button>
        <span class="stepper__value">${esc(value)}${esc(suffix)}</span>
        <button class="stepper__btn" data-action="${action}" ${extra} data-delta="1" ${
          value >= max ? 'disabled' : ''
        }>+</button>
      </span>
    </div>`;
}

export function render(app) {
  const model = app.model;
  const p = model.profile;
  const projection = model.projection();
  const lastBackup = app.store.meta?.lastBackupAt;
  const installed =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const language = card(
    t('settings.language'),
    `<div class="card--pad">
      ${segmented(
        [
          ['en', 'English'],
          ['fr', 'Français'],
          ['ar', 'العربية'],
        ],
        app.lang,
        'set-lang',
      )}
    </div>`,
  );

  const appearance = card(
    t('settings.theme'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.8rem">
      ${segmented(
        [
          ['dark', t('settings.themeDark')],
          ['light', t('settings.themeLight')],
          ['auto', t('settings.themeAuto')],
        ],
        p.theme,
        'set-theme',
      )}
      <div>
        <div class="field__label">${esc(t('settings.textSize'))}</div>
        ${segmented(
          [
            ['0.9', 'A−'],
            ['1', 'A'],
            ['1.15', 'A+'],
            ['1.3', 'A++'],
          ],
          p.textScale,
          'set-scale',
        )}
        <p class="field__hint">${esc(t('settings.textSizeHint'))}</p>
      </div>
    </div>`,
  );

  const prayer = card(
    t('settings.prayer'),
    `<div class="list">
      ${row({
        label: t('settings.location'),
        value: `${p.location.name}${p.location.country ? ` · ${p.location.country}` : ''}`,
        action: 'open-city',
        iconName: 'pin',
      })}
      <div class="card--pad" style="display:flex;flex-direction:column;gap:.8rem">
        <div class="field">
          <label class="field__label">${esc(t('settings.method'))}</label>
          <select class="select" data-change="set-method">
            ${METHOD_IDS.map(
              (id) =>
                `<option value="${id}" ${p.method === id ? 'selected' : ''}>${esc(
                  METHOD_LABELS[id] || id,
                )}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="field">
          <span class="field__label">${esc(t('settings.asrShadow'))}</span>
          ${segmented(
            [
              ['1', t('settings.asrStandard')],
              ['2', t('settings.asrHanafi')],
            ],
            p.asrShadow,
            'set-asr',
          )}
        </div>
        <div class="field">
          <span class="field__label">${esc(t('settings.offsets'))}</span>
          ${PRAYERS.map((entry) =>
            stepper({
              label: t(`prayer.${entry}`),
              value: signed(p.offsets[entry] || 0),
              action: 'set-offset',
              min: -20,
              max: 20,
              extra: `data-prayer="${entry}"`,
              suffix: ' min',
            }),
          ).join('')}
          <p class="field__hint">${esc(t('settings.offsetsHint'))}</p>
        </div>
      </div>
    </div>`,
  );

  const obligation = card(
    t('settings.obligation'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.8rem">
      <div class="field">
        <span class="field__label">${esc(t('settings.gender'))}</span>
        ${segmented(
          [
            ['male', t('onboarding.male')],
            ['female', t('onboarding.female')],
          ],
          p.gender,
          'set-gender',
        )}
      </div>
      <div class="field">
        <label class="field__label" for="puberty-input">${esc(t('settings.pubertyDate'))}</label>
        <input id="puberty-input" class="input" type="date" value="${esc(p.pubertyDate || '')}"
          data-change="set-puberty" max="${esc(app.today)}">
        <p class="field__hint">${esc(t('onboarding.pubertyHint'))}</p>
      </div>
      <div class="field">
        <label class="field__label" for="revert-input">${esc(t('settings.revertDate'))}</label>
        <input id="revert-input" class="input" type="date" value="${esc(p.revertDate || '')}"
          data-change="set-revert" min="${esc(p.pubertyDate || '')}" max="${esc(app.today)}">
      </div>
      <div class="field">
        <label class="field__label" for="regular-input">${esc(t('settings.regularSince'))}</label>
        <input id="regular-input" class="input" type="date" value="${esc(p.regularSince || '')}"
          data-change="set-regular" min="${esc(p.pubertyDate || '')}" max="${esc(app.today)}">
        <button class="btn btn--ghost btn--sm" data-action="apply-regular">${esc(
          t('calendar.markDone'),
        )}</button>
        <p class="field__hint">${esc(t('onboarding.regularHint'))}</p>
      </div>
    </div>`,
  );

  const pace = card(
    t('settings.pace'),
    `<div class="card--pad">
      ${stepper({
        label: t('settings.pace'),
        value: projection.quota,
        action: 'set-quota',
        min: 0,
        max: 30,
      })}
      <p class="field__hint">${esc(t('settings.paceHint'))}</p>
      <div class="stat__hint" style="margin-top:.4rem">${esc(t('stats.finish'))}:
        <strong>${esc(projection.finishDate ? dateMedium(projection.finishDate) : '—')}</strong>
      </div>
    </div>`,
  );

  const data = card(
    t('settings.data'),
    `<div class="list">
      ${row({
        label: t('settings.backup'),
        value: lastBackup ? dateMedium(lastBackup.slice(0, 10)) : t('common.none'),
        action: 'open-backup',
        iconName: 'download',
        hint: t('settings.backupHint'),
      })}
      ${row({
        label: t('settings.lock'),
        value: p.lock?.enabled ? t('common.on') : t('common.off'),
        action: 'toggle-lock',
        iconName: 'lock',
        hint: t('settings.lockHint'),
      })}
      ${row({
        label: t('settings.reset'),
        value: '',
        action: 'reset-data',
        iconName: 'trash',
        hint: t('settings.resetHint'),
      })}
    </div>`,
  );

  const install = card(
    t('settings.install'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.6rem">
      <p class="field__hint">${esc(t('settings.installHint'))}</p>
      ${
        installed
          ? `<div class="notice">${icon('check')}<span>${esc(t('settings.installed'))}</span></div>`
          : app.installPrompt
            ? `<button class="btn btn--primary btn--block" data-action="install-app">${icon(
                'download',
              )} ${esc(t('settings.install'))}</button>`
            : `<div class="notice">${icon('info')}<span>${esc(t('onboarding.useGps'))}</span></div>`
      }
    </div>`,
  );

  const about = card(
    t('settings.about'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.7rem">
      <div style="display:flex;gap:.6rem;align-items:flex-start">
        ${icon('shield')}
        <div>
          <strong style="font-size:.9rem">${esc(t('settings.privacy'))}</strong>
          <p class="field__hint">${esc(t('settings.privacyHint'))}</p>
        </div>
      </div>
      <hr class="hr">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="field__hint">${esc(t('settings.version', { version: VERSION }))}</span>
        <span class="dim" style="font-size:.72rem" data-count="${number(projection.remaining)}"></span>
      </div>
      ${
        supportsConfigured()
          ? `<a class="btn btn--ghost btn--block" href="${esc(
              LINKS.koFi,
            )}" target="_blank" rel="noopener noreferrer">${icon('heart')} ${esc(
              t('settings.support'),
            )}</a>`
          : `<a class="btn btn--ghost btn--block" href="${esc(
              LINKS.repository,
            )}" target="_blank" rel="noopener noreferrer">${icon('globe')} ${esc(
              t('settings.support'),
            )}</a>`
      }
      <p class="field__hint">${esc(t('settings.supportHint'))}</p>
    </div>`,
  );

  return [language, appearance, prayer, obligation, pace, data, install, about].join('');
}

export const handlers = {
  'set-lang': (app, el) => {
    const code = el.dataset.value;
    app.lang = code;
    setI18nLanguage(code);
    app.store.writeMeta({ lang: code });
    app.model.profile.language = code;
    app.store.save(app.model);
    app.applyVisualPreferences();
    app.render();
  },
  'set-theme': (app, el) => {
    app.commit((model) => model.updateProfile({ theme: el.dataset.value }), { silent: true });
    app.applyVisualPreferences();
    app.render({ preserveScroll: true });
  },
  'set-scale': (app, el) => {
    app.commit((model) => model.updateProfile({ textScale: Number(el.dataset.value) }), {
      silent: true,
    });
    app.applyVisualPreferences();
    app.render({ preserveScroll: true });
  },
  'set-gender': (app, el) => {
    app.commit((model) => model.updateProfile({ gender: el.dataset.value }), { silent: true });
  },
  'set-asr': (app, el) => {
    app.commit((model) => model.updateProfile({ asrShadow: Number(el.dataset.value) }), {
      silent: true,
    });
    app.refreshClock();
    app.render({ preserveScroll: true });
  },
  'set-offset': (app, el) => {
    const prayer = el.dataset.prayer;
    const delta = Number(el.dataset.delta);
    app.commit(
      (model) => {
        const offsets = { ...model.profile.offsets };
        offsets[prayer] = Math.max(-20, Math.min(20, (offsets[prayer] || 0) + delta));
        model.updateProfile({ offsets });
      },
      { silent: true },
    );
    app.refreshClock();
    app.render({ preserveScroll: true });
  },
  'set-quota': (app, el) => {
    const delta = Number(el.dataset.delta);
    const next = Math.max(0, Math.min(30, app.model.profile.quotaPrayers + delta));
    app.commit((model) => model.setQuota(next), { silent: true });
  },
  'open-city': (app) => app.openSheet('city', { query: '' }),
  'open-backup': (app) => app.openSheet('backup', { passphrase: '' }),
  'toggle-lock': (app) => {
    if (app.model.profile.lock?.enabled) {
      app.openSheet('pin', { mode: 'remove', value: '' });
    } else {
      app.openSheet('pin', { mode: 'set', value: '', stage: 'new' });
    }
  },
  'reset-data': (app) => {
    app.openSheet('confirm', {
      title: t('settings.reset'),
      body: t('settings.resetHint'),
      confirmLabel: t('common.delete'),
      action: 'do-reset',
      danger: true,
    });
  },
  'do-reset': (app) => {
    app.store.clear();
    app.model = null;
    app.sheet = null;
    location.hash = '';
    window.location.reload();
  },
  'install-app': async (app) => {
    if (!app.installPrompt) return;
    app.installPrompt.prompt();
    await app.installPrompt.userChoice;
    app.installPrompt = null;
    app.render({ preserveScroll: true });
  },
  'apply-regular': (app) => {
    const date = app.model.profile.regularSince;
    if (!date) {
      app.showToast(t('error.date'));
      return;
    }
    app.commit((model) => model.applyRegularSince(date), { message: t('calendar.markDone') });
  },
};

export const changes = {
  'set-method': (app, el) => {
    app.commit((model) => model.updateProfile({ method: el.value }), { silent: true });
    app.refreshClock();
    app.render({ preserveScroll: true });
  },
  'set-puberty': (app, el) => {
    if (!el.value) return;
    app.commit((model) => model.updateProfile({ pubertyDate: el.value }), {
      message: t('settings.saved'),
    });
  },
  'set-revert': (app, el) => {
    app.commit((model) => model.updateProfile({ revertDate: el.value || null }), {
      message: t('settings.saved'),
    });
  },
  'set-regular': (app, el) => {
    app.commit((model) => model.updateProfile({ regularSince: el.value || null }), { silent: true });
  },
};
