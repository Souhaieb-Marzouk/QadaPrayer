/**
 * Bottom sheets: confirming a prayer, deferring make-ups, day detail,
 * bulk edits, city picker, backup/restore and the PIN gate.
 */

import { t, number, dateLong, dateMedium } from '../i18n.js';
import { PRAYERS, addDays, dayOfISO, isISO } from '../core/dates.js';
import { MARK_DONE, MARK_EXEMPT, MARK_MISSED, slotIndex } from '../core/engine.js';
import { clock, esc } from './dom.js';
import { icon, PRAYER_ARABIC } from './icons.js';
import { createBackup, readBackup, isEncryptedBackup, hashPin, verifyPin, cryptoAvailable } from '../store.js';
import { LINKS } from '../config.js';
import { angleDelta, guidance, headingFrom, qiblaBearing, smoothHeading } from '../core/qibla.js';
import { searchCities } from '../../data/cities.js';
import { saveFile } from '../download.js';

/** A lifetime ledger is a few KB; 4 MB is already generous. */
const MAX_BACKUP_BYTES = 4 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function sheetShell({ title, subtitle, body, foot, wide = false }) {
  return `
    <div class="scrim" data-action="scrim-close"></div>
    <section class="sheet${wide ? ' sheet--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(
      title,
    )}" tabindex="-1">
      <div class="sheet__head">
        <div>
          <h2 class="sheet__title">${title}</h2>
          ${subtitle ? `<div class="sheet__sub">${subtitle}</div>` : ''}
        </div>
        <button class="icon-btn sheet__close" data-action="close-sheet" aria-label="${esc(
          t('common.close'),
        )}">${icon('close')}</button>
      </div>
      <div class="sheet__body">${body}</div>
      ${foot ? `<div class="sheet__foot">${foot}</div>` : ''}
    </section>`;
}

function checkRow({ id, label, hint, checked, action = 'toggle-sheet-check' }) {
  return `
    <button class="check-row" data-action="${action}" data-id="${id}" data-checked="${
      checked ? 1 : 0
    }" role="checkbox" aria-checked="${checked ? 'true' : 'false'}">
      <span class="check-row__box">${icon('check')}</span>
      <span class="check-row__label">${label}</span>
      ${hint ? `<span class="check-row__hint">${esc(hint)}</span>` : ''}
    </button>`;
}

function prayerLabel(prayer) {
  return `<span>${esc(t(`prayer.${prayer}`))}</span> <span class="dim">${esc(
    PRAYER_ARABIC[prayer],
  )}</span>`;
}

/* ------------------------------------------------------------------ */
/* Prayer confirmation                                                 */
/* ------------------------------------------------------------------ */

function prayerSheet(app, sheet) {
  const model = app.model;
  const { date, prayer } = sheet;
  const isToday = date === app.today;
  const plan = isToday ? model.plan(date) : null;
  const item = plan?.items.find((entry) => entry.prayer === prayer);
  const slot = slotIndex(date, prayer);
  const mark = model.get(slot);

  // Make-ups still owed under this prayer, plus the ones already marked under it,
  // so a batch can be corrected one line at a time.
  const owed = item ? item.qada : [];
  const already = model.lastQadaIndices(date, prayer);
  const qada = [...new Set([...already, ...owed])].sort((a, b) => a - b);

  const checked = sheet.checked
    ? new Set(sheet.checked.map(String))
    : new Set([
        ...(mark === MARK_DONE ? ['self'] : []),
        ...qada.filter((index) => model.get(index) === MARK_DONE).map(String),
      ]);

  const qadaRows = qada.map((index) =>
    checkRow({
      id: String(index),
      label: `${esc(t(`prayer.${PRAYERS[index % 5]}`))} <span class="dim">${esc(
        dateMedium(dayISO(index)),
      )}</span>`,
      checked: checked.has(String(index)),
    }),
  );

  const time = isToday && app.day ? `${clock(app.day.windows[prayer].start)} – ${clock(app.day.windows[prayer].end)}` : '';

  const body = `
    ${checkRow({
      id: 'self',
      label: prayerLabel(prayer),
      hint: time,
      checked: checked.has('self'),
    })}
    ${qada.length ? `<div class="field__label" style="margin-top:.4rem">${esc(t('sheet.qadaTitle'))}</div>` : ''}
    ${qadaRows.join('')}
    ${qada.length ? `<p class="field__hint">${esc(t('sheet.uncheckHint'))}</p>` : ''}
  `;

  const done = mark === MARK_DONE;
  const foot = done
    ? `<button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
       <button class="btn btn--primary" data-action="sheet-save-marks">${esc(t('sheet.save'))}</button>`
    : isToday
      ? `<button class="btn" data-action="sheet-not-prayed">${esc(t('sheet.confirmNo'))}</button>
         <button class="btn btn--primary" data-action="sheet-prayed">${esc(t('sheet.confirmYes'))}</button>`
      : `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>
         <button class="btn btn--primary" data-action="sheet-save-day" data-prayer="${prayer}">${esc(
           t('sheet.save'),
         )}</button>`;

  return sheetShell({
    title: esc(t('sheet.title', { prayer: t(`prayer.${prayer}`) })),
    subtitle: esc(isToday ? `${t('common.today')} · ${time}` : dateLong(date)),
    body,
    foot,
  });
}

function dayISO(index) {
  const day = Math.floor(index / 5);
  const dt = new Date(day * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate(),
  ).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Deferral                                                            */
/* ------------------------------------------------------------------ */

function deferSheet(app, sheet) {
  const count = sheet.pending?.length || 0;
  const body = `
    <div class="field__hint">${esc(t('sheet.deferTitle', { count }))}</div>
    <button class="check-row" data-action="sheet-defer" data-mode="next" style="align-items:flex-start">
      <span class="check-row__box">${icon('arrow-right')}</span>
      <span>
        <span class="check-row__label">${esc(t('sheet.deferNext'))}</span>
        <span class="field__hint">${esc(t('sheet.deferNextHint'))}</span>
      </span>
    </button>
    <button class="check-row" data-action="sheet-defer" data-mode="tomorrow" style="align-items:flex-start">
      <span class="check-row__box">${icon('calendar')}</span>
      <span>
        <span class="check-row__label">${esc(t('sheet.deferTomorrow'))}</span>
        <span class="field__hint">${esc(t('sheet.deferTomorrowHint'))}</span>
      </span>
    </button>
  `;
  return sheetShell({
    title: esc(t('sheet.deferNext')),
    subtitle: esc(t('sheet.deferTitle', { count })),
    body,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('sheet.cancel'))}</button>`,
  });
}

function deferQadaSheet(app, sheet) {
  const count = sheet.pending?.length || 0;
  return sheetShell({
    title: esc(t('sheet.deferQadaTitle')),
    subtitle: esc(t('sheet.deferQadaHint', { count })),
    body: `
      <button class="check-row" data-action="sheet-defer-qada" data-mode="next" style="align-items:flex-start">
        <span class="check-row__box">${icon('arrow-right')}</span>
        <span>
          <span class="check-row__label">${esc(t('sheet.deferNext'))}</span>
          <span class="field__hint">${esc(t('sheet.deferNextHint'))}</span>
        </span>
      </button>
      <button class="check-row" data-action="sheet-defer-qada" data-mode="tomorrow" style="align-items:flex-start">
        <span class="check-row__box">${icon('calendar')}</span>
        <span>
          <span class="check-row__label">${esc(t('sheet.deferTomorrow'))}</span>
          <span class="field__hint">${esc(t('sheet.deferTomorrowHint'))}</span>
        </span>
      </button>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('sheet.cancel'))}</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Day detail                                                          */
/* ------------------------------------------------------------------ */

export function renderDaySheet(app, sheet) {
  const model = app.model;
  const date = sheet.date;
  const status = model.dayStatus(date);
  const rows = PRAYERS.map((prayer) => {
    const index = slotIndex(date, prayer);
    const owed = model.isOwed(index);
    const mark = model.get(index);
    return checkRow({
      id: prayer,
      action: 'day-toggle',
      label: prayerLabel(prayer),
      hint: owed ? '' : t('common.none'),
      checked: mark === MARK_DONE,
    });
  }).join('');

  const summary = model.dayStatus(date);
  const body = `
    <div class="field__hint">${esc(t(`calendar.${summary === 'before' ? 'beforePuberty' : summary === 'future' ? 'future' : 'empty'}`))}</div>
    ${rows}
  `;

  const foot = `
    <button class="btn" data-action="day-step" data-delta="-1" aria-label="${esc(
      t('today.previousDay'),
    )}">${icon('chevronLeft')}</button>
    <button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>
    <button class="btn btn--primary" data-action="day-mark-all" data-date="${date}">${esc(
      t('calendar.markAllDay'),
    )}</button>
    <button class="btn btn--ghost" data-action="day-mark-missed" data-date="${date}">${esc(
      t('calendar.markMissed'),
    )}</button>
    ${
      app.model.profile.gender === 'female'
        ? `<button class="btn btn--ghost" data-action="day-mark-exempt" data-date="${date}">${esc(
            t('calendar.markExcused'),
          )}</button>`
        : ''
    }
    <button class="btn" data-action="day-step" data-delta="1" aria-label="${esc(
      t('today.nextDay'),
    )}">${icon('chevronRight')}</button>
  `;

  return sheetShell({
    title: esc(dateLong(date)),
    subtitle: esc(
      status === 'before'
        ? t('calendar.beforePuberty')
        : status === 'future'
          ? t('calendar.future')
          : status === 'exempt'
            ? t('status.exempt')
            : `${t('calendar.daysDone', { done: countDone(model, date), total: countOwed(model, date) })}`,
    ),
    body,
    foot,
  });
}

function countDone(model, date) {
  return PRAYERS.filter((prayer) => model.get(slotIndex(date, prayer)) === MARK_DONE).length;
}

function countOwed(model, date) {
  return PRAYERS.filter((prayer) => {
    const index = slotIndex(date, prayer);
    return model.isOwed(index) && model.get(index) !== MARK_EXEMPT;
  }).length;
}

/* ------------------------------------------------------------------ */
/* Bulk edit                                                           */
/* ------------------------------------------------------------------ */

function bulkSheet(app) {
  const sheet = app.sheet;
  const from = sheet.from;
  const to = sheet.to;
  const mode = sheet.mode || 'done';
  const count = countChange(app.model, from, to, mode, app.today);

  const body = `
    <div class="btn-row" style="margin-bottom:.3rem">
      <button class="btn btn--sm" data-action="bulk-preset" data-preset="month">${esc(t('calendar.thisMonth'))}</button>
      <button class="btn btn--sm" data-action="bulk-preset" data-preset="year">${esc(t('calendar.thisYear'))}</button>
      <button class="btn btn--sm" data-action="bulk-preset" data-preset="all">${esc(t('calendar.everything'))}</button>
    </div>
    <div class="field">
      <label class="field__label">${esc(t('calendar.from'))}</label>
      <input class="input" type="date" data-change="bulk-from" value="${esc(from)}" min="${esc(
        app.model.profile.pubertyDate || '',
      )}" max="${esc(addDays(app.today, -1))}">
    </div>
    <div class="field">
      <label class="field__label">${esc(t('calendar.to'))}</label>
      <input class="input" type="date" data-change="bulk-to" value="${esc(to)}" min="${esc(
        app.model.profile.pubertyDate || '',
      )}" max="${esc(addDays(app.today, -1))}">
    </div>
    <div class="field">
      <span class="field__label">${esc(t('calendar.bulk'))}</span>
      <div class="segmented">
        <button class="segmented__btn" data-action="bulk-mode" data-mode="done" aria-pressed="${
          mode === 'done'
        }">${esc(t('calendar.markDone'))}</button>
        <button class="segmented__btn" data-action="bulk-mode" data-mode="missed" aria-pressed="${
          mode === 'missed'
        }">${esc(t('calendar.markMissed'))}</button>
      </div>
      ${
        app.model.profile.gender === 'female'
          ? `<div class="segmented" style="margin-top:.35rem">
              <button class="segmented__btn" data-action="bulk-mode" data-mode="exempt" aria-pressed="${
                mode === 'exempt'
              }">${esc(t('calendar.markExempt'))}</button>
            </div>
            <p class="field__hint">${esc(t('calendar.exemptHint'))}</p>`
          : ''
      }
    </div>
    <div class="notice">${icon('info')}<span>${esc(t('calendar.preview', { count: number(count) }))}</span></div>
  `;

  return sheetShell({
    title: esc(t('calendar.bulk')),
    subtitle: esc(t('calendar.legend')),
    body,
    foot: `
      <button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
      <button class="btn btn--primary" data-action="bulk-apply" ${count ? '' : 'disabled'}>${esc(
        t('calendar.apply'),
      )}</button>`,
  });
}

function countChange(model, from, to, mode, today) {
  if (!isISO(from) || !isISO(to)) return 0;
  const target = mode === 'done' ? MARK_DONE : mode === 'exempt' ? MARK_EXEMPT : MARK_MISSED;
  const start = model.startIndex;
  if (start === null) return 0;
  const fromIndex = Math.max(start, dayOfISO(from) * 5);
  const toIndex = Math.min(model.backlogEnd(today), dayOfISO(to) * 5 + 4);
  if (toIndex < fromIndex) return 0;
  let count = 0;
  const skipExempt = target === MARK_DONE;
  for (let i = fromIndex; i <= toIndex; i += 1) {
    const current = model.get(i);
    if (current === target) continue;
    // days already excused are not part of "N prayers will change"
    if (skipExempt && current === MARK_EXEMPT) continue;
    count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* City picker                                                         */
/* ------------------------------------------------------------------ */

function citySheet(app) {
  const query = app.sheet.query || '';
  const results = searchCities(query, 40);
  return sheetShell({
    title: esc(t('settings.location')),
    subtitle: esc(t('onboarding.locationHint')),
    body: `
      <div class="field">
        <input class="input" type="search" data-live="city-query" value="${esc(
          query,
        )}" placeholder="${esc(t('onboarding.searchCity'))}" autocomplete="off">
      </div>
      
      <div class="city-list">
        ${results
          .map(
            (city) => `
          <button class="city-item" data-action="city-pick" data-name="${esc(city.name)}" data-lat="${
            city.lat
          }" data-lon="${city.lon}" data-tz="${esc(city.tz)}" data-country="${esc(city.country)}">
            <span>${icon('pin')}</span>
            <span>
              <span class="city-item__name">${esc(city.name)}</span><br>
              <span class="city-item__country">${esc(city.country)}</span>
            </span>
          </button>`,
          )
          .join('')}
      </div>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Backup / restore                                                    */
/* ------------------------------------------------------------------ */

function backupSheet(app) {
  const pass = app.sheet.passphrase || '';
  const canEncrypt = cryptoAvailable();
  return sheetShell({
    title: esc(t('backup.title')),
    subtitle: esc(t('backup.exportBody')),
    body: `
      <div class="field">
        <label class="field__label">${esc(t('backup.passphrase'))}</label>
        <input class="input" type="password" data-live="backup-pass" value="${esc(
          pass,
        )}" placeholder="••••••••" autocomplete="new-password" ${
          canEncrypt ? '' : 'disabled'
        }>
        <p class="field__hint">${esc(t('backup.passphraseHint'))}</p>
      </div>
      ${
        canEncrypt
          ? ''
          : `<div class="notice">${icon('info')}<span>Encryption is unavailable in this context.</span></div>`
      }
      <hr class="hr">
      <div class="field__label">${esc(t('backup.importTitle'))}</div>
      <p class="field__hint">${esc(t('backup.importBody'))}</p>
      <input class="input" type="file" accept="application/json,.json,.qada" data-change="backup-file">
      <div id="restore-status"></div>
    `,
    foot: `
      <button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>
      <button class="btn btn--primary" data-action="backup-download">${icon('download')} ${esc(
        t('backup.exportButton'),
      )}</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Confirm                                                             */
/* ------------------------------------------------------------------ */

function confirmSheet(app) {
  const sheet = app.sheet;
  return sheetShell({
    title: esc(sheet.title || t('common.confirm')),
    subtitle: sheet.body ? esc(sheet.body) : '',
    body: '',
    foot: `
      <button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
      ${
        sheet.secondaryAction
          ? `<button class="btn" data-action="${sheet.secondaryAction}">${esc(
              sheet.secondaryLabel || t('common.confirm'),
            )}</button>`
          : ''
      }
      <button class="btn ${sheet.danger ? 'btn--danger' : 'btn--primary'}" data-action="${
        sheet.action || 'noop'
      }">${esc(sheet.confirmLabel || t('common.confirm'))}</button>`,
  });
}

function nameSheet(app) {
  const sheet = app.sheet;
  return sheetShell({
    title: esc(sheet.mode === 'rename' ? t('people.name') : t('people.nameTitle')),
    body: `
      <div class="field">
        <label class="field__label">${esc(t('people.name'))}</label>
        <input class="input" data-live="name-input" data-autofocus maxlength="40"
          autocomplete="off" value="${esc(sheet.value || '')}">
        <p class="field__hint">${esc(t('people.nameHint'))}</p>
      </div>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
           <button class="btn btn--primary" data-action="name-save">${esc(t('common.save'))}</button>`,
  });
}

function syncSheet(app) {
  const sheet = app.sheet;
  const code = app.store?.meta?.syncCode || '';

  if (sheet.mode === 'manage' && code) {
    return sheetShell({
      title: esc(t('sync.title')),
      subtitle: esc(t('sync.codeHint')),
      body: `
        <code class="sync-code">${esc(code)}</code>
        <p class="field__hint">${esc(t('sync.hint'))}</p>
        <button class="btn btn--ghost btn--sm btn--block" data-action="sync-copy">${esc(
          t('sync.copy'),
        )}</button>
        <button class="btn btn--ghost btn--sm btn--block" data-action="sync-stop">${esc(
          t('sync.stop'),
        )}</button>
      `,
      foot: `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>
             <button class="btn btn--ghost" data-action="sync-forget">${esc(t('sync.deleteRemote'))}</button>
             <button class="btn btn--primary" data-action="sync-now">${esc(t('sync.now'))}</button>`,
    });
  }

  return sheetShell({
    title: esc(t('sync.title')),
    subtitle: esc(t('sync.hint')),
    body: `
      <div class="field">
        <label class="field__label">${esc(t('sync.join'))}</label>
        <input class="input" data-live="sync-input" value="${esc(sheet.input || '')}"
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false">
      </div>
      <div class="field">
        <label class="field__label">${esc(t('sync.server'))}</label>
        <input class="input" data-live="sync-endpoint" value="${esc(sheet.endpointValue || '')}"
          placeholder="https://…" autocomplete="off" spellcheck="false">
      </div>
      <button class="btn btn--ghost btn--sm btn--block" data-action="sync-create">${esc(
        t('sync.create'),
      )}</button>
      <button class="btn btn--ghost btn--sm btn--block" data-action="sync-test">${esc(
        t('sync.test'),
      )}</button>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
           <button class="btn btn--primary" data-action="sync-join">${esc(t('sync.use'))}</button>`,
  });
}

function snapshotsSheet(app) {
  const list = app.store?.listSnapshots?.() || [];

  const body = list.length
    ? `<div class="list">${list
        .map(
          (entry) => `
        <div class="list__row">
          <span class="list__label">${esc(dateLong(entry.at.slice(0, 10)))}<span class="field__hint" style="display:block">${esc(
            entry.at.slice(11, 16),
          )}</span></span>
          <button class="btn btn--ghost btn--sm" data-action="snapshot-restore" data-at="${esc(
            entry.at,
          )}">${esc(t('snapshots.restore'))}</button>
        </div>`,
        )
        .join('')}</div>`
    : `<div class="notice">${icon('info')}<span>${esc(t('snapshots.empty'))}</span></div>`;

  return sheetShell({
    title: esc(t('snapshots.title')),
    subtitle: esc(t('snapshots.hint')),
    body,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>`,
  });
}

/**
 * The qibla dial.
 *
 * The rose turns with the phone, so "up" on screen is the way you are facing,
 * and the Kaaba marker sits at the bearing. When the marker reaches the top,
 * you are facing the qibla. Readings are smoothed: a raw magnetometer jitters
 * by several degrees.
 */
function qiblaSheet(app) {
  const location = app.model.profile.location;
  const bearing = qiblaBearing(location.lat, location.lon);
  const hasCompass = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

  return sheetShell({
    title: esc(t('qibla.title')),
    subtitle: esc(location.name || ''),
    body: `
      <div class="qibla">
        <div class="qibla__dial">
          <div class="qibla__rose" id="qibla-rose" data-bearing="${bearing}">
            <span class="qibla__north">N</span>
            <span class="qibla__east">E</span>
            <span class="qibla__south">S</span>
            <span class="qibla__west">W</span>
            <div class="qibla__kaaba" id="qibla-kaaba" style="transform:translate(-50%,-50%) rotate(${bearing}deg) translateY(-88px) rotate(${-bearing}deg)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.8 20.4 7v10L12 21.2 3.6 17V7z" fill="currentColor" opacity=".22"/>
                <path d="M12 2.8 20.4 7v10L12 21.2 3.6 17V7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M3.6 9.6 12 13.6l8.4-4" fill="none" stroke="currentColor" stroke-width="1.3"/>
                <path d="M3.6 9.6V13l8.4 4 8.4-4V9.6" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".7"/>
              </svg>
            </div>
          </div>
          <div class="qibla__pointer" aria-hidden="true"></div>
        </div>
      </div>

      <div class="qibla__state" id="qibla-state" data-aligned="0">
        <span class="qibla__deg">${esc(`${Math.round(bearing)}°`)}</span>
        <span id="qibla-hint">${esc(t('qibla.hint'))}</span>
      </div>

      <div class="stat" style="margin-top:.4rem">
        <div class="stat__label">${esc(t('qibla.bearing'))}</div>
        <div class="stat__value">${esc(`${Math.round(bearing)}°`)}</div>
      </div>

      ${
        hasCompass
          ? `<button class="btn btn--ghost btn--sm btn--block" data-action="qibla-permission">${esc(
              t('qibla.enable'),
            )}</button>`
          : `<div class="notice">${icon('info')}<span>${esc(t('qibla.unavailable'))}</span></div>`
      }
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>`,
  });
}

/** Follow the magnetometer while the dial is open; stop when it closes. */
export function attachCompass() {
  stopCompass();
  if (typeof window === 'undefined') return;

  const rose = document.getElementById('qibla-rose');
  const state = document.getElementById('qibla-state');
  const hint = document.getElementById('qibla-hint');
  if (!rose) return;

  const bearing = Number(rose.dataset.bearing) || 0;
  let heading = null;
  let seen = false;

  const update = (event) => {
    const next = headingFrom(event);
    if (next === null) return;

    seen = true;

    // Ignore micro-movements: a magnetometer jitters by a degree or two even
    // when the phone is still.
    if (heading !== null && Math.abs(angleDelta(heading, next)) < 1.5) return;

    heading = smoothHeading(heading, next, 0.18);
    rose.style.transform = `rotate(${-heading}deg)`;

    const guide = guidance(bearing, heading);
    if (state) {
      state.dataset.aligned = guide.aligned ? '1' : '0';
      state.style.setProperty('--bearing', `${bearing}deg`);
    }
    if (hint && Number.isFinite(guide.relative)) {
      if (guide.aligned) hint.textContent = t('qibla.align');
      else {
        hint.textContent = `${Math.round(Math.abs(guide.relative))}° ${
          guide.side === 'right' ? '→' : '←'
        }`;
      }
    }
  };

  // One source only: absolute when the device offers it, otherwise the plain
  // event. Listening to both makes the needle fight itself and spin.
  let usingAbsolute = false;
  const absoluteOnly = (event) => {
    usingAbsolute = true;
    update(event);
  };
  const relativeOnly = (event) => {
    if (usingAbsolute) return;
    update(event);
  };

  compassHandler = update;
  compassSource = { absolute: absoluteOnly, relative: relativeOnly };
  window.addEventListener('deviceorientationabsolute', absoluteOnly, true);
  window.addEventListener('deviceorientation', relativeOnly, true);

  // No reading after two seconds: say so rather than showing a frozen dial.
  setTimeout(() => {
    if (!seen && hint && state) {
      state.dataset.aligned = '0';
      hint.textContent = t('qibla.unavailable');
    }
  }, 2000);
}

let compassHandler = null;
let compassSource = null;

export function stopCompass() {
  if (!compassSource || typeof window === 'undefined') return;
  window.removeEventListener('deviceorientationabsolute', compassSource.absolute, true);
  window.removeEventListener('deviceorientation', compassSource.relative, true);
  compassHandler = null;
  compassSource = null;
}

/* ------------------------------------------------------------------ */
/* PIN                                                                 */
/* ------------------------------------------------------------------ */

function pinSheet(app) {
  const sheet = app.sheet;
  const value = sheet.value || '';
  const dots = Array.from(
    { length: 4 },
    (_, i) => `<span class="pin-dot" data-filled="${i < value.length ? 1 : 0}"></span>`,
  ).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return sheetShell({
    title: esc(t(sheet.mode === 'remove' ? 'settings.removePin' : 'settings.setPin')),
    subtitle: esc(sheet.hint || ''),
    body: `
      <div class="pin-dots">${dots}</div>
      <div class="pin-pad">
        ${keys
          .map((key) =>
            key === ''
              ? '<span></span>'
              : `<button class="pin-key" data-action="pin-key" data-key="${key}">${esc(key)}</button>`,
          )
          .join('')}
      </div>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.cancel'))}</button>
           <button class="btn btn--primary" data-action="pin-save" ${
             value.length === 4 ? '' : 'disabled'
           }>${esc(t('common.save'))}</button>`,
  });
}

function supportSheet() {
  return sheetShell({
    title: esc(t('settings.support')),
    subtitle: esc(t('settings.supportHint')),
    body: `
      <a class="btn btn--primary btn--block" href="${esc(LINKS.koFi)}" target="_blank" rel="noopener noreferrer">${icon(
        'heart',
      )} Ko-fi</a>
      <a class="btn btn--ghost btn--block" href="${esc(LINKS.payPal)}" target="_blank" rel="noopener noreferrer">${icon(
        'globe',
      )} PayPal</a>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Extra make-ups                                                      */
/* ------------------------------------------------------------------ */

function extraSheet(app) {
  const count = Math.max(1, Math.min(50, Number(app.sheet.count) || 5));
  const remaining = app.model.stats(app.today).remaining;

  if (remaining === 0) {
    return sheetShell({
      title: esc(t('extra.title')),
      body: `<div class="notice">${icon('moonCheck')}<span>${esc(t('extra.none'))}</span></div>`,
      foot: `<button class="btn" data-action="close-sheet">${esc(t('common.close'))}</button>`,
    });
  }

  const usable = Math.min(count, remaining);
  const label = usable === 1 ? t('extra.countOne') : t('extra.count', { n: usable });

  return sheetShell({
    title: esc(t('extra.title')),
    subtitle: esc(t('extra.hint')),
    body: `
      <div class="stepper">
        <span class="stepper__controls">
          <button class="stepper__btn" data-action="extra-step" data-delta="-1" ${
            count <= 1 ? 'disabled' : ''
          }>−</button>
          <span class="stepper__value">${esc(String(usable))}</span>
          <button class="stepper__btn" data-action="extra-step" data-delta="1" ${
            usable >= 50 ? 'disabled' : ''
          }>+</button>
        </span>
      </div>
      <div class="notice">${icon('spark')}<span>${esc(label)}</span></div>
    `,
    foot: `<button class="btn" data-action="close-sheet">${esc(t('sheet.cancel'))}</button>
           <button class="btn btn--primary" data-action="extra-confirm">${esc(
             t('extra.confirm'),
           )}</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderSheet(app) {
  const sheet = app.sheet;
  if (!sheet) return '';
  switch (sheet.type) {
    case 'prayer':
      return prayerSheet(app, sheet);
    case 'defer':
      return deferSheet(app, sheet);
    case 'deferQada':
      return deferQadaSheet(app, sheet);
    case 'day':
      return renderDaySheet(app, sheet);
    case 'bulk':
      return bulkSheet(app);
    case 'city':
      return citySheet(app);
    case 'backup':
      return backupSheet(app);
    case 'confirm':
      return confirmSheet(app);
    case 'pin':
      return pinSheet(app);
    case 'extra':
      return extraSheet(app);
    case 'name':
      return nameSheet(app);
    case 'sync':
      return syncSheet(app);
    case 'snapshots':
      return snapshotsSheet(app);
    case 'qibla':
      return qiblaSheet(app);
    case 'support':
      return supportSheet();
    default:
      return '';
  }
}

export function closeSheetState(app) {
  app.sheet = null;
}

/**
 * Apply exactly what is ticked in the prayer sheet: the prayer itself and each
 * make-up under it — including un-ticking ones that were marked before.
 */
function applyPrayerSelection(app, { proposeDefer }) {
  const sheet = app.sheet;
  const model = app.model;
  if (!sheet) return;

  const checked = new Set((sheet.checked || []).map(String));
  const { date, prayer } = sheet;

  const plan = date === app.today ? model.plan(date) : null;
  const item = plan?.items.find((entry) => entry.prayer === prayer);
  const owed = item ? item.qada : [];
  const listed = [...new Set([...model.lastQadaIndices(date, prayer), ...owed])];

  const self = checked.has('self') ? MARK_DONE : MARK_MISSED;
  const qada = {};
  for (const index of listed) {
    qada[index] = checked.has(String(index)) ? MARK_DONE : MARK_MISSED;
  }

  const unmarked = listed.filter((index) => !checked.has(String(index)));

  app.commit(
    (instance) => instance.applySelection({ dateISO: date, prayer, self, qada }),
    { message: self === MARK_DONE ? t('common.undoDone') : t('common.undo') },
  );

  if (proposeDefer && self === MARK_DONE && unmarked.length && date === app.today) {
    app.openSheet('deferQada', { date, prayer, pending: unmarked });
    app.render();
    return;
  }

  app.closeSheet();
}

export const handlers = {
  'qibla-attach': () => attachCompass(),

  'toggle-sheet-check': (app, el) => {
    const id = el.dataset.id;
    const sheet = app.sheet;
    const checked = new Set(sheet.checked || []);
    const key = /^\d+$/.test(id) ? Number(id) : id;
    if (checked.has(key) || checked.has(id)) {
      checked.delete(key);
      checked.delete(id);
    } else {
      checked.add(key);
    }
    sheet.checked = [...checked];
    app.render({ preserveScroll: true });
  },

  'sheet-prayed': (app) => applyPrayerSelection(app, { proposeDefer: true }),

  'sheet-save-marks': (app) => applyPrayerSelection(app, { proposeDefer: false }),

  'sheet-not-prayed': (app) => {
    const sheet = app.sheet;
    const checked = new Set((sheet.checked || []).map((v) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));
    const pending = [...checked].filter((v) => typeof v === 'number');
    if (!pending.length) {
      app.commit((model) => model.applyOutcome({ dateISO: sheet.date, prayer: sheet.prayer, prayed: false }));
      app.closeSheet();
      return;
    }
    app.openSheet('defer', { date: sheet.date, prayer: sheet.prayer, pending });
  },

  'sheet-defer': (app, el) => {
    const sheet = app.sheet;
    const mode = el.dataset.mode;
    app.commit(
      (model) =>
        model.applyOutcome({
          dateISO: sheet.date,
          prayer: sheet.prayer,
          prayed: false,
          defer: mode,
        }),
      { message: t('common.undoDefer') },
    );
    app.closeSheet();
  },

  'sheet-defer-qada': (app, el) => {
    const sheet = app.sheet;
    const mode = el.dataset.mode;
    app.sheet = null;

    if (mode === 'tomorrow') {
      // The user asked for "tomorrow": every make-up still open today moves, not
      // only the ones under this prayer.
      app.commit((model) => model.pauseDay(sheet.date), {
        message: t('sheet.deferTomorrow'),
      });
      return;
    }

    app.render({ preserveScroll: true });
  },

  'sheet-save-day': (app, el) => {
    const sheet = app.sheet;
    const checked = new Set((sheet.checked || []).map((v) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));
    const prayed = checked.has('self');
    const qada = [...checked].filter((v) => typeof v === 'number');
    app.commit(
      (model) => {
        model.setMark(sheet.date, el.dataset.prayer, prayed ? MARK_DONE : MARK_MISSED);
        model.markMany(qada, prayed ? MARK_DONE : MARK_MISSED);
      },
      { message: t('common.undoDone') },
    );
    app.closeSheet();
  },

  'day-toggle': (app, el) => {
    const date = app.sheet.date;
    const prayer = el.dataset.id;
    const index = slotIndex(date, prayer);
    const nextValue = app.model.get(index) === MARK_DONE ? MARK_MISSED : MARK_DONE;
    app.commit((model) => model.setMark(date, prayer, nextValue));
  },

  'today-excuse': (app) => {
    app.openSheet('confirm', {
      title: t('today.excuse'),
      body: t('today.excuseBody'),
      confirmLabel: t('today.excuse'),
      action: 'do-today-excuse',
    });
  },

  'do-today-excuse': (app) => {
    app.commit(
      (model) => {
        model.markRange(app.today, app.today, MARK_EXEMPT, { includeToday: true });
        // What she still owed today is not owed today: it moves to tomorrow.
        model.pauseDay(app.today);
      },
      { message: t('today.excuse') },
    );
    app.closeSheet();
  },

  'day-mark-missed': (app, el) => {
    const date = el.dataset.date;
    app.commit((model) => model.markRange(date, date, MARK_MISSED), {
      message: t('calendar.markMissed'),
    });
    app.closeSheet();
  },

  'day-mark-exempt': (app, el) => {
    const date = el.dataset.date;
    app.commit((model) => model.markRange(date, date, MARK_EXEMPT), {
      message: t('calendar.markExempt'),
    });
    app.closeSheet();
  },

  'day-mark-all': (app, el) => {
    const date = el.dataset.date;
    app.commit((model) => model.markRange(date, date, MARK_DONE), {
      message: t('calendar.markAllDay'),
    });
    app.closeSheet();
  },

  'bulk-preset': (app, el) => {
    const preset = el.dataset.preset;
    const sheet = app.sheet;
    if (preset === 'all') {
      sheet.from = app.model.profile.pubertyDate;
      sheet.to = addDays(app.today, -1);
    } else if (preset === 'year') {
      const year = String(app.cal.year || app.today.slice(0, 4));
      sheet.from = `${year}-01-01`;
      sheet.to = `${year}-12-31`;
    } else {
      const year = String(app.cal.year || app.today.slice(0, 4));
      const month = app.cal.month;
      const index = month === null || month === undefined ? Number(app.today.slice(5, 7)) - 1 : month;
      const prefix = `${year}-${String(index + 1).padStart(2, '0')}`;
      sheet.from = `${prefix}-01`;
      sheet.to = addDays(app.today, -1);
    }
    app.render({ preserveScroll: true });
  },

  'bulk-mode': (app, el) => {
    app.sheet.mode = el.dataset.mode;
    app.render({ preserveScroll: true });
  },

  'bulk-apply': (app) => {
    const sheet = app.sheet;
    const value = sheet.mode === 'done' ? MARK_DONE : sheet.mode === 'exempt' ? MARK_EXEMPT : MARK_MISSED;
    let count = 0;
    app.commit(
      (model) => {
        count = model.markRange(sheet.from, sheet.to, value, {
          skipExempt: value === MARK_DONE,
        });
      },
      { message: t('calendar.preview', { count: number(count) }) },
    );
    app.closeSheet();
  },

  'city-pick': (app, el) => {
    const location = {
      name: el.dataset.name,
      country: el.dataset.country,
      lat: Number(el.dataset.lat),
      lon: Number(el.dataset.lon),
      tz: el.dataset.tz,
    };
    applyLocation(app, location);
  },

  'city-gps': (app) => {
    if (!navigator.geolocation) {
      app.showToast(t('location.unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        applyLocation(app, {
          name: app.model.profile.location.name || 'My location',
          country: '',
          lat: Number(position.coords.latitude.toFixed(4)),
          lon: Number(position.coords.longitude.toFixed(4)),
          tz,
        });
      },
      () => app.showToast(t('error.generic')),
      { timeout: 10000 },
    );
  },

  'backup-download': async (app) => {
    const passphrase = app.sheet?.passphrase || '';
    try {
      const text = await createBackup(app.model.toJSON(), { passphrase });
      const stamp = new Date().toISOString().slice(0, 10);
      saveFile({
        name: `qada-backup-${stamp}.json`,
        mime: 'application/json',
        text,
      });
      app.store.writeMeta({ lastBackupAt: new Date().toISOString() });
      app.showToast(t('backup.exported'));
      app.closeSheet();
    } catch (error) {
      app.showToast(error.message || t('error.generic'));
    }
  },

  'name-save': (app) => {
    const sheet = app.sheet;
    const value = String(sheet.value || '').trim();
    if (!value) return;

    if (sheet.mode === 'rename' && sheet.id) {
      app.store.renameProfile(sheet.id, value);
      app.sheet = null;
      app.render({ preserveScroll: true });
      return;
    }

    // A new person: collect their own obligation through the onboarding.
    app.sheet = null;
    app.addingProfile = true;
    app.onb = { step: 0, draft: null, newName: value };
    app.render();
  },

  'noop': () => {},

  'extra-open': (app) => {
    const remaining = app.model.stats(app.today).remaining;
    app.openSheet('extra', { count: Math.min(5, Math.max(1, remaining)) });
  },

  'extra-step': (app, el) => {
    const sheet = app.sheet;
    const next = Math.max(1, Math.min(50, (Number(sheet.count) || 5) + Number(el.dataset.delta)));
    sheet.count = next;
    app.render({ preserveScroll: true });
  },

  'extra-confirm': (app) => {
    const count = Number(app.sheet.count) || 0;
    let marked = 0;
    app.commit(
      (model) => {
        marked = model.markNextMakeUps(count, app.today).length;
      },
      { silent: true },
    );
    app.closeSheet();
    if (marked > 0) {
      app.showToast(t('extra.done', { n: marked }), t('common.undo'), 'undo');
    }
  },

  'pin-key': (app, el) => {
    const sheet = app.sheet;
    const key = el.dataset.key;
    let value = sheet.value || '';
    if (key === '⌫') value = value.slice(0, -1);
    else if (value.length < 4) value += key;
    sheet.value = value;
    app.render({ preserveScroll: true });
  },

  'pin-save': async (app) => {
    const sheet = app.sheet;
    const value = sheet.value || '';
    if (value.length !== 4) return;

    if (sheet.mode === 'remove') {
      const ok = await verifyPin(value, app.model.profile.lock);
      if (!ok) {
        app.showToast(t('backup.wrongPassphrase'));
        sheet.value = '';
        app.render({ preserveScroll: true });
        return;
      }
      app.commit((model) => model.updateProfile({ lock: { enabled: false, hash: null, salt: null } }), {
        silent: true,
      });
      app.closeSheet();
      app.showToast(t('settings.saved'));
      return;
    }

    if (sheet.stage === 'new') {
      sheet.first = value;
      sheet.value = '';
      sheet.stage = 'confirm';
      sheet.hint = t('settings.changePin');
      app.render({ preserveScroll: true });
      return;
    }

    if (value !== sheet.first) {
      app.showToast(t('backup.wrongPassphrase'));
      sheet.value = '';
      sheet.stage = 'new';
      sheet.first = null;
      app.render({ preserveScroll: true });
      return;
    }

    const { hash, salt } = await hashPin(value);
    app.commit((model) => model.updateProfile({ lock: { enabled: true, hash, salt } }), {
      silent: true,
    });
    app.closeSheet();
    app.showToast(t('settings.saved'));
  },
};

function applyLocation(app, location) {
  app.commit(
    (model) => {
      model.updateProfile({ location });
    },
    { message: t('settings.saved') },
  );
  app.refreshClock();
  app.closeSheet();
}

export const changes = {
  'bulk-from': (app, el) => {
    app.sheet.from = el.value;
    app.render({ preserveScroll: true });
  },
  'bulk-to': (app, el) => {
    app.sheet.to = el.value;
    app.render({ preserveScroll: true });
  },
  'backup-file': async (app, el) => {
    const file = el.files?.[0];
    if (!file) return;

    // A ledger is a few kilobytes. Anything huge is a mistake or an attack on
    // the tab's memory, so it is refused before it is read.
    if (file.size > MAX_BACKUP_BYTES) {
      app.showToast(t('backup.tooLarge'));
      return;
    }

    const passphrase = app.sheet?.passphrase || '';

    try {
      const text = await file.text();
      if (isEncryptedBackup(text) && !passphrase) {
        app.showToast(t('backup.needPassphrase'));
        return;
      }
      const data = await readBackup(text, { passphrase });
      app.restoreBackup(data);
    } catch (error) {
      const map = {
        'passphrase-required': t('backup.needPassphrase'),
        'passphrase-wrong': t('backup.wrongPassphrase'),
        invalid: t('backup.invalid'),
        newer: t('backup.newer'),
      };
      app.showToast(map[error.message] || t('error.generic'));
    }
  },
};

export const live = {
  'name-input': (app, el) => {
    if (app.sheet) app.sheet.value = el.value;
  },
  'sync-input': (app, el) => {
    if (app.sheet) app.sheet.input = el.value;
  },
  'sync-endpoint': (app, el) => {
    if (app.sheet) app.sheet.endpointValue = el.value;
  },
  'city-query': (app, el) => {
    app.sheet.query = el.value;
    app.render({ preserveScroll: true });
    const input = document.querySelector('[data-live="city-query"]');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },
  'backup-pass': (app, el) => {
    app.sheet.passphrase = el.value;
  },
};
