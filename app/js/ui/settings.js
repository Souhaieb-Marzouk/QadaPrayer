/** Settings: everything the user can change, without ever touching history. */

import { t, number, dateMedium, setLanguage as setI18nLanguage } from '../i18n.js';
import { PRAYERS } from '../core/dates.js';
import { clock, esc, notice as noticeHtml, signed } from './dom.js';
import { icon } from './icons.js';
import { LINKS, METHOD_LABELS, VERSION, supportsConfigured } from '../config.js';
import { METHOD_IDS } from '../core/prayerTimes.js';
import { normalizeReminders } from '../core/reminders.js';
import { nextEvents, permission, primeAudio, requestPermission, sendTest } from '../notify.js';
import { exportName, ledgerCsv } from '../exporter.js';
import { hasNativeBridge } from '../native.js';
import { generateCode, normalizeCode } from '../sync/code.js';
import { makeClient } from '../sync/client.js';
import { forgetRemote, syncOnce } from '../sync/sync.js';
import { attachCompass } from './sheets.js';
import { checkForApkUpdate, installUpdate } from '../apk.js';

function syncCard(app) {
  const sync = app.store?.getSync?.() || {};
  const code = sync.code || '';
  const last = sync.lastSyncAt || '';
  const status = sync.lastError || '';
  const endpoint = sync.endpoint || LINKS.syncEndpoint || '';

  const body = !endpoint
    ? `<div class="card--pad" style="display:flex;flex-direction:column;gap:.6rem">
        <p class="field__hint">${esc(t('sync.hint'))}</p>
        <button class="btn btn--ghost btn--sm btn--block" data-action="open-sync">${icon('upload')} ${esc(
          t('sync.enable'),
        )}</button>
      </div>`
    : code
      ? `<div class="card--pad" style="display:flex;flex-direction:column;gap:.6rem">
        <p class="field__hint">${esc(t('sync.hint'))}</p>
        <code class="sync-code">${esc(code)}</code>
        <div class="stat__hint">${esc(t('sync.last'))}: ${esc(last ? last.slice(0, 10) : t('sync.never'))}</div>
        ${
          status
            ? `<div class="stat__hint" style="color:var(--danger)">${esc(
                t('sync.lastError'),
              )}: ${esc(status.slice(0, 90))}</div>`
            : ''
        }
        <button class="btn btn--primary btn--sm btn--block" data-action="sync-now">${icon('upload')} ${esc(
          t('sync.now'),
        )}</button>
        <button class="btn btn--ghost btn--sm btn--block" data-action="sync-copy">${esc(
          t('sync.copy'),
        )}</button>
        <button class="btn btn--ghost btn--sm btn--block" data-action="open-sync">${esc(
          t('sync.deleteRemote'),
        )}</button>
      </div>`
      : `<div class="card--pad" style="display:flex;flex-direction:column;gap:.6rem">
        <p class="field__hint">${esc(t('sync.hint'))}</p>
        <button class="btn btn--ghost btn--sm btn--block" data-action="open-sync">${icon('upload')} ${esc(
          t('sync.enable'),
        )}</button>
      </div>`;

  return card(t('sync.title'), body);
}

/** Run one sync against the configured server. */
async function performSync(app, { quiet = false } = {}) {
  const sync = app.store?.getSync?.() || {};
  const code = sync.code;
  const endpoint = sync.endpoint || LINKS.syncEndpoint;

  if (!code || !endpoint) {
    app.store?.setSync({ lastError: !code ? 'no-code' : 'no-endpoint' });
    app.render({ preserveScroll: true });
    if (!quiet) app.showToast(!code ? t('sync.badCode') : t('sync.server'));
    return;
  }

  if (!quiet) app.showToast(t('sync.working'));

  try {
    const result = await syncOnce({ endpoint, code, model: app.model });
    if (result.changed) {
      app.model = result.model;
      app.store.save(app.model, { immediate: true });
      app.refreshClock();
    }
    app.store.setSync({ lastSyncAt: new Date().toISOString(), lastError: '' });
    app.sheet = null;
    app.render({ preserveScroll: true });

    // Say when the other phone brought something in — a silent change is
    // unsettling on a ledger.
    if (result.changed) app.showToast(t('sync.pulled'));
    else if (!quiet) app.showToast(t('sync.done'));
  } catch (error) {
    const reason = String(error?.message || error || 'unknown');
    // Kept on the card, so a failure is still readable once the toast is gone.
    app.store?.setSync({ lastError: reason });
    app.render({ preserveScroll: true });

    const key =
      reason === 'bad-code' ? 'sync.badCode' : reason === 'no-crypto' ? 'sync.noCrypto' : 'sync.error';
    const detail = reason && !['bad-code', 'no-crypto'].includes(reason) ? ` (${reason})` : '';
    app.showToast(`${t(key)}${detail}`);
  }
}

export { performSync };

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
          ['sepia', t('settings.themeSepia')],
          ['night', t('settings.themeNight')],
          ['auto', t('settings.themeAuto')],
        ],
        p.theme,
        'set-theme',
      )}
      ${segmented(
        [
          ['auto', t('settings.numeralsAuto')],
          ['arabic', t('settings.numeralsArabic')],
        ],
        p.numerals || 'auto',
        'set-numerals',
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
        label: t('qibla.title'),
        value: '',
        action: 'open-qibla',
        iconName: 'pin',
      })}
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

  const profileList = app.store?.listProfiles ? app.store.listProfiles() : [];
  const people = card(
    t('people.title'),
    `<div class="list">
      ${profileList
        .map(
          (entry) => `
        <div class="list__row" style="align-items:center">
          <button class="list__label" data-action="switch-profile" data-id="${entry.id}"
            style="background:none;border:0;padding:0;text-align:start;cursor:pointer">
            ${esc(entry.name)}
            ${
              entry.active
                ? `<span class="field__hint" style="display:block">${esc(t('people.active'))}</span>`
                : ''
            }
          </button>
          ${
            entry.active
              ? `${icon('check')}<button class="icon-btn" data-action="rename-profile" data-id="${
                  entry.id
                }" aria-label="${esc(t('people.rename'))}">${icon('edit')}</button>`
              : `<button class="icon-btn" data-action="delete-profile" data-id="${entry.id}"
                   aria-label="${esc(t('common.delete'))}">${icon('trash')}</button>`
          }
        </div>`,
        )
        .join('')}
      <div class="card--pad" style="display:flex;flex-direction:column;gap:.5rem">
        ${
          profileList.length < 8
            ? `<button class="btn btn--ghost btn--sm btn--block" data-action="add-person">${icon(
                'plus',
              )} ${esc(t('people.add'))}</button>`
            : `<p class="field__hint">${esc(t('people.limit', { n: 8 }))}</p>`
        }
        <p class="field__hint">${esc(t('people.ownBackup'))}</p>
      </div>
    </div>`,
  );

  const sync = syncCard(app);

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
        label: t('settings.csv'),
        value: '',
        action: 'export-csv',
        iconName: 'chart',
        hint: t('settings.csvHint'),
      })}
      ${row({
        label: t('snapshots.title'),
        value: '',
        action: 'open-snapshots',
        iconName: 'clock',
        hint: t('snapshots.hint'),
      })}
      ${row({
        label: t('settings.print'),
        value: '',
        action: 'open-print',
        iconName: 'edit',
        hint: t('settings.printHint'),
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

  const n = normalizeReminders(p.notifications);
  const nextEvent = n.enabled ? nextEvents(app, 1)[0] : null;
  const permissionState = permission();
  const reminders = card(
    t('settings.reminders'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.55rem">
      <button class="switch" role="switch" aria-checked="${n.enabled}" data-action="rem-toggle" data-key="enabled">
        <span>
          <span class="switch__label">${esc(t('reminders.enable'))}</span>
          <span class="switch__hint">${esc(t('reminders.enableHint'))}</span>
        </span>
        <span class="switch__track"><span class="switch__thumb"></span></span>
      </button>
      ${
        n.enabled
          ? `
        <div class="field">
          <span class="field__label">${esc(t('reminders.prayers'))}</span>
          <div class="segmented">
            ${PRAYERS.map(
              (prayer) => `<button class="segmented__btn" data-action="rem-toggle" data-key="${prayer}"
                aria-pressed="${Boolean(n[prayer])}">${esc(t(`prayer.${prayer}`))}</button>`,
            ).join('')}
          </div>
        </div>

        <div class="field">
          <span class="field__label">${esc(t('reminders.lead'))}</span>
          ${segmented(
            [
              ['0', t('reminders.leadNow')],
              ['5', t('reminders.lead5')],
              ['10', t('reminders.lead10')],
              ['15', t('reminders.lead15')],
            ],
            n.lead,
            'rem-lead',
          )}
        </div>

        <div class="field">
          <span class="field__label">${esc(t('reminders.quietFrom'))} — ${esc(t('reminders.quietTo'))}</span>
          <div class="field__row">
            <input class="input" type="number" min="0" max="23" inputmode="numeric"
              value="${n.quietFrom}" data-change="rem-quiet" data-key="quietFrom">
            <span class="dim">→</span>
            <input class="input" type="number" min="0" max="23" inputmode="numeric"
              value="${n.quietTo}" data-change="rem-quiet" data-key="quietTo">
          </div>
          <span class="field__hint">${esc(t('reminders.quietHint'))}</span>
        </div>

        <button class="switch" role="switch" aria-checked="${n.qada}" data-action="rem-toggle" data-key="qada">
          <span>
            <span class="switch__label">${esc(t('reminders.qadaTitle'))}</span>
            <span class="switch__hint">${esc(t('reminders.qadaHint'))}</span>
          </span>
          <span class="switch__track"><span class="switch__thumb"></span></span>
        </button>
        ${
          n.qada
            ? stepper({
                label: t('reminders.qadaTime'),
                value: n.qadaHour,
                action: 'rem-qada-hour',
                min: 0,
                max: 23,
                suffix: ':00',
              })
            : ''
        }

        <div style="display:flex;gap:.4rem">
          <button class="switch" style="flex:1" role="switch" aria-checked="${n.sound}" data-action="rem-toggle" data-key="sound">
            <span class="switch__label">${esc(t('reminders.sound'))}</span>
            <span class="switch__track"><span class="switch__thumb"></span></span>
          </button>
          <button class="switch" style="flex:1" role="switch" aria-checked="${n.vibrate}" data-action="rem-toggle" data-key="vibrate">
            <span class="switch__label">${esc(t('reminders.vibrate'))}</span>
            <span class="switch__track"><span class="switch__thumb"></span></span>
          </button>
        </div>

        <div class="field">
          <span class="field__label">${esc(t('reminders.sound'))}</span>
          ${segmented(
            [
              ['chime', t('reminders.soundChime')],
              ['bell', t('reminders.soundBell')],
              ['none', t('reminders.soundNone')],
            ],
            n.sound || 'chime',
            'rem-sound',
          )}
        </div>

        <button class="btn btn--ghost btn--sm" data-action="rem-test">${icon('bell')} ${esc(
          t('reminders.test'),
        )}</button>

        ${
          nextEvent
            ? `<div class="stat__hint">${esc(
                t('reminders.next', { time: clock(nextEvent.time ?? nextEvent.atMinutes) }),
              )}</div>`
            : ''
        }
        ${
          permissionState === 'denied'
            ? noticeHtml(t('reminders.permissionDenied'), 'danger')
            : permissionState !== 'granted'
              ? noticeHtml(t('reminders.permissionNeeded'), 'info')
              : ''
        }`
          : ''
      }
      <p class="field__hint">${esc(t('reminders.limits'))}</p>
    </div>`,
  );

  const about = card(
    t('settings.about'),
    `<div class="card--pad" style="display:flex;flex-direction:column;gap:.7rem">
      <div style="display:flex;gap:.6rem;align-items:flex-start">
        ${icon('shield', 'about-icon')}
        <div>
          <strong style="font-size:.9rem">${esc(t('settings.privacy'))}</strong>
          <p class="field__hint">${esc(t('settings.privacyHint'))}</p>
        </div>
      </div>
      <hr class="hr">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="field__hint">${esc(t('update.apkCurrent'))}</span>
        <span class="dim" style="font-size:.72rem">${esc(
          app.apkVersion || '—',
        )}</span>
      </div>
      ${
        app.apkUpdate
          ? `<div class="notice">${icon('download')}<span>${esc(
              t('update.apkAvailable', { version: app.apkUpdate.version }),
            )}</span></div>
             <button class="btn btn--primary btn--sm btn--block" data-action="install-apk">${esc(
               t('update.apkInstall'),
             )}</button>`
          : ''
      }
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="field__hint">${esc(t('settings.version', { version: VERSION }))}</span>
        <span class="dim" style="font-size:.72rem" data-count="${number(projection.remaining)}"></span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="field__hint">${esc(t('settings.nativeLink'))}</span>
        <span class="dim" style="font-size:.72rem">${esc(
          hasNativeBridge() ? t('common.on') : t('common.off'),
        )}</span>
      </div>
      <button class="btn btn--ghost btn--sm btn--block" data-action="check-updates">${icon(
        'download',
      )} ${esc(t('update.check'))}</button>
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

  return [
    language,
    appearance,
    prayer,
    obligation,
    pace,
    reminders,
    people,
    sync,
    data,
    install,
    about,
  ].join('');
}

export const handlers = {
  'rem-toggle': async (app, el) => {
    const key = el.dataset.key;
    const config = normalizeReminders(app.model.profile.notifications);

    if (key === 'enabled' && !config.enabled) {
      const state = await requestPermission();
      if (state !== 'granted') {
        app.showToast(t('reminders.permissionDenied'));
        app.render({ preserveScroll: true });
        return;
      }
      primeAudio();
    }

    const next = { ...config, [key]: !config[key] };
    app.commit((model) => model.updateProfile({ notifications: next }), { silent: true });
  },

  'rem-lead': (app, el) => {
    const config = normalizeReminders(app.model.profile.notifications);
    app.commit(
      (model) =>
        model.updateProfile({ notifications: { ...config, lead: Number(el.dataset.value) } }),
      { silent: true },
    );
  },

  'rem-qada-hour': (app, el) => {
    const config = normalizeReminders(app.model.profile.notifications);
    const hour = Math.max(0, Math.min(23, config.qadaHour + Number(el.dataset.delta)));
    app.commit((model) => model.updateProfile({ notifications: { ...config, qadaHour: hour } }), {
      silent: true,
    });
  },

  'rem-test': async (app) => {
    const state = await requestPermission();
    if (state !== 'granted') {
      app.showToast(t('reminders.permissionDenied'));
      return;
    }
    primeAudio();
    const ok = await sendTest(app);
    if (!ok) app.showToast(t('reminders.permissionDenied'));
  },

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
  'set-numerals': (app, el) => {
    app.commit((model) => model.updateProfile({ numerals: el.dataset.value }), { silent: true });
    app.applyVisualPreferences();
    app.render({ preserveScroll: true });
  },

  'open-qibla': (app) => {
    app.openSheet('qibla', {});
    requestAnimationFrame(() => attachCompass());
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
  'open-support': (app) => app.openSheet('support', {}),

  'open-snapshots': (app) => app.openSheet('snapshots', {}),

  'rem-sound': (app, el) => {
    const config = normalizeReminders(app.model.profile.notifications);
    app.commit(
      (model) => model.updateProfile({ notifications: { ...config, sound: el.dataset.value } }),
      { silent: true },
    );
    app.applyVisualPreferences();
  },

  'snapshot-restore': (app, el) => {
    const model = app.store.restoreSnapshot(el.dataset.at);
    if (!model) {
      app.showToast(t('snapshots.empty'));
      return;
    }
    app.model = model;
    app.store.save(model, { immediate: true });
    app.refreshClock();
    app.sheet = null;
    app.render();
    app.showToast(t('snapshots.restored'));
  },

  'sync-stop': (app) => {
    app.openSheet('confirm', {
      title: t('sync.stop'),
      body: t('sync.stopHint'),
      confirmLabel: t('sync.stop'),
      action: 'do-sync-stop',
      danger: true,
    });
  },

  'do-sync-stop': (app) => {
    app.sheet = null;
    app.store.setSync({ code: '', endpoint: '', lastSyncAt: '', lastError: '' });
    app.render({ preserveScroll: true });
    app.showToast(t('sync.stopped'));
  },

  'open-sync': (app) => {
    const code = app.store?.getSync?.().code || '';
    if (code) {
      app.openSheet('sync', { mode: 'manage' });
      return;
    }
    app.openSheet('sync', {
      mode: 'join',
      input: '',
      endpointValue: app.store?.getSync?.().endpoint || LINKS.syncEndpoint || '',
    });
  },

  'sync-create': (app) => {
    const endpoint =
      String(app.sheet?.endpointValue || '').trim() ||
      app.store?.getSync?.().endpoint ||
      LINKS.syncEndpoint ||
      '';
    if (!/^https?:\/\//.test(endpoint)) {
      app.showToast(t('sync.server'));
      return;
    }
    const code = generateCode();
    app.store.setSync({ code, endpoint });
    app.sheet = null;
    app.render({ preserveScroll: true });
    performSync(app);
  },

  'sync-join': (app) => {
    const code = normalizeCode(app.sheet?.input || '');
    if (!code) {
      app.showToast(t('sync.badCode'));
      return;
    }
    const endpoint =
      String(app.sheet?.endpointValue || '').trim() ||
      app.store?.getSync?.().endpoint ||
      LINKS.syncEndpoint ||
      '';
    if (!/^https?:\/\//.test(endpoint)) {
      app.showToast(t('sync.server'));
      return;
    }
    app.store.setSync({ code, endpoint });
    app.sheet = null;
    app.render({ preserveScroll: true });
    performSync(app);
  },

  'sync-now': (app) => {
    performSync(app);
  },

  'sync-test': async (app) => {
    const endpoint =
      app.store?.getSync?.().endpoint ||
      LINKS.syncEndpoint ||
      String(app.sheet?.endpointValue || '').trim();
    if (!endpoint) {
      app.showToast(t('sync.server'));
      return;
    }
    try {
      const status = await makeClient({ endpoint }).ping();
      app.showToast(`${t('sync.ok')} (HTTP ${status})`);
    } catch (error) {
      app.showToast(`${t('sync.offline')} (${String(error?.message || error)})`);
    }
  },

  'sync-copy': async (app) => {
    const code = app.store?.getSync?.().code || '';
    try {
      await navigator.clipboard.writeText(code);
      app.showToast(t('sync.copied'));
    } catch {
      app.showToast(code);
    }
  },

  'sync-forget': (app) => {
    app.openSheet('confirm', {
      title: t('sync.deleteRemote'),
      body: t('sync.confirmDelete'),
      confirmLabel: t('sync.deleteRemote'),
      action: 'do-sync-forget',
      danger: true,
    });
  },

  'do-sync-forget': async (app) => {
    const sync = app.store?.getSync?.() || {};
    const code = sync.code;
    const endpoint = sync.endpoint || LINKS.syncEndpoint;
    app.sheet = null;
    app.render({ preserveScroll: true });
    if (!code || !endpoint) return;

    try {
      await forgetRemote({ endpoint, code });
      app.store.setSync({ code: '', lastSyncAt: '', lastError: '' });
      app.render();
      app.showToast(t('sync.deleted'));
    } catch {
      app.showToast(t('sync.error'));
    }
  },

  'add-person': (app) => {
    if ((app.store.listProfiles?.() || []).length >= 8) {
      app.showToast(t('people.limit', { n: 8 }));
      return;
    }
    app.openSheet('name', { mode: 'add', value: '' });
  },

  'switch-profile': (app, el) => {
    const id = el.dataset.id;
    if (!id || id === app.store.activeId) return;

    const model = app.store.switchTo(id, app.model);
    if (!model) return;

    app.model = model;
    app.route = 'today';
    app.cal.year = Number(app.today.slice(0, 4));
    app.refreshClock();
    app.store.save(model, { immediate: true });
    window.scrollTo({ top: 0 });
    app.render();

    const name = (app.store.listProfiles() || []).find((entry) => entry.active)?.name || '';
    app.showToast(t('people.switched', { name }));
  },

  'rename-profile': (app, el) => {
    const id = el.dataset.id;
    const entry = (app.store.listProfiles() || []).find((profile) => profile.id === id);
    if (!entry) return;
    app.openSheet('name', { mode: 'rename', id, value: entry.name });
  },

  'delete-profile': (app, el) => {
    const id = el.dataset.id;
    const entry = (app.store.listProfiles() || []).find((profile) => profile.id === id);
    app.openSheet('confirm', {
      title: t('common.delete'),
      body: t('people.deleteHint', { name: entry ? entry.name : '' }),
      confirmLabel: t('common.delete'),
      action: 'do-delete-profile',
      danger: true,
      payload: { id },
    });
  },

  'do-delete-profile': (app) => {
    const id = app.sheet?.payload?.id;
    app.sheet = null;
    if (!id) return;

    const model = app.store.removeProfile(id, app.model);
    if (model) app.model = model;
    app.refreshClock();
    app.render();
  },

  'open-backup': (app) => app.openSheet('backup', { passphrase: '' }),

  'export-csv': (app) => {
    try {
      const csv = ledgerCsv(app.model, { today: app.today });
      // The BOM keeps Excel from mangling the file.
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportName(app.model, 'ledger', app.today)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      app.showToast(t('csv.exported'));
    } catch {
      app.showToast(t('csv.failed'));
    }
  },

  'open-print': (app) => {
    app.route = 'print';
    app.sheet = null;
    if (location.hash !== '#/print') history.replaceState(null, '', '#/print');
    window.scrollTo({ top: 0 });
    app.render();
  },
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
  'rem-quiet': (app, el) => {
    const config = normalizeReminders(app.model.profile.notifications);
    const key = el.dataset.key;
    const value = Math.max(0, Math.min(23, Math.round(Number(el.value) || 0)));
    app.commit(
      (model) => model.updateProfile({ notifications: { ...config, [key]: value } }),
      { silent: true },
    );
  },

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
