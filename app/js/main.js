/**
 * Application shell: boot, routing, clock, rendering and event dispatch.
 *
 * Rendering is a full re-render of a template string on every state change.
 * At this size (a handful of screens, a few hundred nodes) that is both fast
 * and immune to the class of bugs where the DOM drifts from the model.
 */

import { Store } from './store.js';
import { Qada, slotIndex } from './core/engine.js';
import { PRAYERS, addDays, instantToLocalParts, todayISO } from './core/dates.js';
import { computeDay } from './core/prayerTimes.js';
import * as i18n from './i18n.js';
import { icon } from './ui/icons.js';
import { esc } from './ui/dom.js';
import * as onboarding from './ui/onboarding.js';
import * as todayScreen from './ui/today.js';
import * as calendarScreen from './ui/calendar.js';
import * as statsScreen from './ui/stats.js';
import * as settingsScreen from './ui/settings.js';
import * as sheets from './ui/sheets.js';
import * as lock from './ui/lock.js';
import * as printScreen from './ui/print.js';
import { renderLock } from './ui/lock.js';
import { resetShown, scheduleReminders } from './notify.js';
import { applyUpdate, checkForUpdate, initUpdater } from './updater.js';
import { buildSnapshot, publishSnapshot } from './native.js';
import { mergeModels } from './merge.js';

export const app = {
  store: new Store(),
  model: null,
  route: 'today',
  today: null,
  day: null,
  now: 0,
  sheet: null,
  toast: null,
  toastTimer: null,
  cal: { year: 0, month: null },
  unlocked: false,
  lang: 'en',
  installPrompt: null,
  demo: false,
  onb: null,
  lockPin: '',
};

const HANDLERS = {
  ...onboarding.handlers,
  ...todayScreen.handlers,
  ...calendarScreen.handlers,
  ...statsScreen.handlers,
  ...settingsScreen.handlers,
  ...sheets.handlers,
  ...lock.handlers,
  ...printScreen.handlers,
};

const CHANGE_HANDLERS = {
  ...onboarding.changes,
  ...settingsScreen.changes,
  ...sheets.changes,
};

const LIVE_HANDLERS = {
  ...onboarding.live,
  ...statsScreen.live,
  ...sheets.live,
};

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

export function boot() {
  const params = new URLSearchParams(location.search);
  const demoFlag = params.get('demo');

  app.model = app.store.load();
  if (!app.model && demoFlag) {
    app.model = buildDemoModel();
    app.demo = true;
  }

  const metaLang = app.store.meta?.lang;
  const profileLang = app.model?.profile?.language;
  app.lang = profileLang || metaLang || detectLanguage();
  i18n.setLanguage(app.lang);

  if (app.model) {
    refreshClock();
    app.cal.year = Number(app.today.slice(0, 4));
    app.route = normaliseRoute(location.hash);
  }
  applyUrlState(params);
  applyVisualPreferences();

  window.addEventListener('hashchange', () => {
    const next = normaliseRoute(location.hash);
    if (next !== app.route) {
      app.route = next;
      app.sheet = null;
      render();
    }
  });

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('change', onDocumentChange);
  document.addEventListener('input', onDocumentInput);
  document.addEventListener('keydown', onKeyDown);

  // Offer the reload when a new version of the app is waiting.
  initUpdater({
    onAvailable: () => showToast(i18n.t('update.available'), i18n.t('update.reload'), 'reload'),
  });

  // "I prayed" tapped on a reminder: the service worker forwards it here.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'MARK_PRAYED' && data.dateISO && data.prayer) {
        markFromNotification(data.dateISO, data.prayer);
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    app.installPrompt = event;
    if (app.model) render({ preserveScroll: true });
  });

  window.addEventListener('appinstalled', () => {
    app.installPrompt = null;
    render({ preserveScroll: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && app.model) {
      const changed = refreshClock();
      if (changed) resetShown();
      scheduleReminders(app);
      if (changed || app.route === 'today') render({ preserveScroll: true });
    }
  });

  setInterval(() => {
    if (!app.model) return;
    const changed = refreshClock();
    if (changed) {
      resetShown();
      scheduleReminders(app);
    }
    if (changed || app.route === 'today') render({ preserveScroll: true });
  }, 30000);

  render();
  scheduleReminders(app);
}

/** Deep-link helpers used by the screenshot tooling: ?lang=ar&theme=light&sheet=prayer:asr */
function applyUrlState(params) {
  const lang = params.get('lang');
  if (lang && ['en', 'fr', 'ar'].includes(lang)) {
    app.lang = lang;
    i18n.setLanguage(lang);
    if (app.model) app.model.profile.language = lang;
  }
  const theme = params.get('theme');
  if (theme && ['dark', 'light', 'auto'].includes(theme) && app.model) {
    app.model.profile.theme = theme;
  }
  const route = params.get('route');
  if (route) app.route = normaliseRoute(`#/${route}`);

  const month = params.get('month');
  if (month) app.cal.month = Number(month);
  const year = params.get('year');
  if (year) app.cal.year = Number(year);
  const calMonth = params.get('calmonth');
  if (calMonth) app.cal.month = Number(calMonth);

  const step = params.get('onb');
  if (step !== null && !app.model) {
    app.onb = { step: Number(step) || 0, draft: null };
  }

  // A reminder action that had to open the app: ?mark=2026-10-31:asr
  const mark = params.get('mark');
  if (mark && app.model) {
    const [dateISO, prayer] = mark.split(':');
    if (dateISO && prayer) {
      setTimeout(() => markFromNotification(dateISO, prayer), 0);
    }
  }

  const sheet = params.get('sheet');
  if (sheet && app.model) {
    const [type, arg] = sheet.split(':');
    const props = {};
    if (type === 'prayer' || type === 'defer') {
      props.date = params.get('date') || app.today;
      props.prayer = arg || 'asr';
      if (type === 'prayer') {
        props.checked = ['self'];
      } else {
        props.pending = [1, 2];
      }
    }
    if (type === 'day') props.date = arg || app.today;
    if (type === 'bulk') {
      props.from = app.model.profile.pubertyDate;
      props.to = addDays(app.today, -1);
      props.mode = 'done';
    }
    if (type === 'city') props.query = '';
    if (type === 'backup') props.passphrase = '';
    if (type === 'pin') props.value = '';
    app.sheet = { type, ...props };
  }
}

function detectLanguage() {
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return ['en', 'fr', 'ar'].includes(nav) ? nav : 'en';
}

function normaliseRoute(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  return ['today', 'calendar', 'stats', 'settings', 'print'].includes(raw) ? raw : 'today';
}

/** Recompute "now", today's date and prayer times. Returns true if the date changed. */
export function refreshClock() {
  if (!app.model) return false;
  const tz = app.model.profile.location.tz || 'UTC';
  const parts = instantToLocalParts(Date.now(), tz);
  const dateISO = todayISO(tz);
  const previous = app.today;
  const now = parts.hh * 60 + parts.mm;

  if (dateISO !== app.today || !app.day) {
    app.today = dateISO;
    app.model.setToday(dateISO);
    app.day = computeDayFor(dateISO);
  }
  app.now = now;
  return previous !== undefined && previous !== dateISO;
}

export function computeDayFor(dateISO) {
  const p = app.model.profile;
  return computeDay({
    dateISO,
    lat: p.location.lat,
    lon: p.location.lon,
    tz: p.location.tz,
    method: p.method,
    asrShadow: p.asrShadow,
    offsets: p.offsets,
  });
}

/* ------------------------------------------------------------------ */
/* Visual preferences                                                  */
/* ------------------------------------------------------------------ */

export function applyVisualPreferences() {
  const profile = app.model?.profile;
  const theme = profile?.theme || app.store.meta?.theme || 'dark';
  const scale = profile?.textScale || app.store.meta?.textScale || 1;
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const effective = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;

  root.dataset.theme = effective;
  root.style.setProperty('--text-scale', String(scale));
  root.lang = app.lang;
  root.dir = i18n.direction();
  document.body?.setAttribute('dir', i18n.direction());
  document.body?.setAttribute('lang', app.lang);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'light' ? '#f7f3ea' : '#06100f');
}

/* ------------------------------------------------------------------ */
/* State mutation                                                      */
/* ------------------------------------------------------------------ */

export function commit(mutator, { message, silent = false } = {}) {
  if (!app.model) return;
  app.store.snapshot(app.model);
  mutator(app.model);
  if (!app.demo) app.store.save(app.model);
  refreshClock();
  // Profile edits (location, method, offsets) change today's timetable, so the
  // day is always rebuilt after a mutation — it costs well under a millisecond.
  app.day = computeDayFor(app.today);
  render({ preserveScroll: true });
  scheduleReminders(app);
  if (message && !silent) showToast(message, i18n.t('common.undo'), 'undo');
}

/** A representative dataset, used by the website screenshots (`?demo=1`). */
function buildDemoModel() {
  const tz = 'Africa/Tunis';
  const today = todayISO(tz);
  const model = Qada.create(
    {
      gender: 'male',
      pubertyDate: '2004-01-01',
      pubertySource: 'known',
      location: { name: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, tz },
      quotaPrayers: 10,
      language: app.lang || 'en',
    },
    today,
  );
  model.markRange('2004-01-01', '2007-06-30', 1);
  model.applyRegularSince('2018-09-01');
  model.setMark(today, 'subh', 1);
  model.setMark(today, 'dhuhr', 1);
  return model;
}

export function replaceModel(model) {
  app.model = model;
  app.store.save(model, { immediate: true });
  refreshClock();
  app.cal.year = Number(app.today.slice(0, 4));
  render();
}

/**
 * Mark a prayer as prayed without going through the confirmation sheet.
 * Used by the "I prayed" button on a reminder notification.
 */
export function markFromNotification(dateISO, prayer) {
  if (!app.model || !PRAYERS.includes(prayer)) return false;
  refreshClock();
  const item =
    dateISO === app.today
      ? app.model.plan(dateISO).items.find((entry) => entry.prayer === prayer)
      : null;

  app.route = 'today';
  app.sheet = null;
  if (location.hash !== '#/today') history.replaceState(null, '', '#/today');

  commit(
    (model) =>
      model.applyOutcome({
        dateISO,
        prayer,
        prayed: true,
        qadaIndices: item ? item.qada : [],
      }),
    { message: i18n.t('common.undoDone') },
  );
  return true;
}

export function restoreBackup(data) {
  app.openSheet('confirm', {
    title: i18n.t('backup.importTitle'),
    body: i18n.t('backup.choose'),
    confirmLabel: i18n.t('backup.importButton'),
    action: 'do-restore',
    secondaryAction: 'do-merge',
    secondaryLabel: i18n.t('backup.merge'),
    danger: true,
    payload: data,
  });
}

/** Take the union of this device and the backup, never dropping a mark. */
function performMerge(data) {
  try {
    const incoming = Qada.fromJSON(data, app.today || todayISO('UTC'));
    const merged = mergeModels(app.model, incoming, app.today);
    app.store.snapshot(app.model);
    app.model = merged;
    app.store.save(merged, { immediate: true });
    refreshClock();
    app.cal.year = Number(app.today.slice(0, 4));
    app.sheet = null;
    render();
    showToast(i18n.t('backup.merged'));
  } catch (error) {
    app.sheet = null;
    render({ preserveScroll: true });
    showToast(error.message === 'newer' ? i18n.t('backup.newer') : i18n.t('backup.invalid'));
  }
}

function performRestore(data) {
  try {
    const model = Qada.fromJSON(data, app.today || todayISO('UTC'));
    app.store.snapshot(app.model);
    app.model = model;
    i18n.setLanguage(model.profile.language);
    app.lang = model.profile.language;
    app.store.save(model, { immediate: true });
    app.store.writeMeta({ lang: app.lang, lastBackupAt: new Date().toISOString() });
    applyVisualPreferences();
    refreshClock();
    app.cal.year = Number(app.today.slice(0, 4));
    app.sheet = null;
    render();
    showToast(i18n.t('backup.restored'));
  } catch (error) {
    app.sheet = null;
    render({ preserveScroll: true });
    showToast(error.message === 'newer' ? i18n.t('backup.newer') : i18n.t('backup.invalid'));
  }
}

export function showToast(message, actionLabel = null, action = null) {
  app.toast = { message, actionLabel, action };
  if (app.toastTimer) clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => {
    app.toast = null;
    render({ preserveScroll: true });
  }, 5200);
  render({ preserveScroll: true });
}

export function openSheet(type, props = {}) {
  app.sheet = { type, ...props };
  render({ preserveScroll: true });
  requestAnimationFrame(() => {
    const target = document.querySelector('.sheet');
    target?.focus?.();
  });
}

export function closeSheet() {
  app.sheet = null;
  render({ preserveScroll: true });
}

export { addDays };

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function render({ preserveScroll = false } = {}) {
  const root = document.getElementById('app');
  if (!root) return;
  const scrollY = window.scrollY;

  if (!app.model) {
    root.innerHTML = onboarding.render(app);
    return;
  }

  if (app.model.profile.lock?.enabled && !app.unlocked) {
    root.innerHTML = renderLock(app);
    return;
  }

  const screen = currentScreen();
  root.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="screen" id="screen">${screen.render(app)}</main>
    </div>
    ${app.route === 'print' ? '' : renderNav()}
    ${sheets.renderSheet(app)}
    ${renderToast()}
  `;

  if (preserveScroll) window.scrollTo({ top: scrollY });
  publishWidget();
}

let widgetTimer = null;

/** Keep the Android widget in step with the app, at most once every 20 s. */
function publishWidget() {
  if (!app.model || !app.day) return;
  if (widgetTimer) return;
  widgetTimer = setTimeout(() => {
    widgetTimer = null;
    try {
      const snapshot = buildSnapshot({
        today: app.today,
        day: app.day,
        model: app.model,
        now: app.now,
      });
      publishSnapshot(snapshot);
    } catch {
      /* the widget is an extra, never a reason to break a render */
    }
  }, 2000);
}

function currentScreen() {
  switch (app.route) {
    case 'calendar':
      return calendarScreen;
    case 'stats':
      return statsScreen;
    case 'settings':
      return settingsScreen;
    case 'print':
      return printScreen;
    default:
      return todayScreen;
  }
}

function renderTopbar() {
  const subtitle = app.today ? i18n.dateLong(app.today) : '';
  const canUndo = app.store.canUndo();
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark">${icon('logo')}</span>
        <div class="brand__text">
          <div class="brand__title">${esc(i18n.t('app.name'))}</div>
          <div class="brand__sub">${esc(subtitle)}</div>
        </div>
      </div>
      <div class="topbar__spacer"></div>
      ${
        canUndo
          ? `<button class="icon-btn" data-action="undo" aria-label="${esc(i18n.t('common.undo'))}">${icon(
              'edit',
            )}</button>`
          : ''
      }
      <button class="icon-btn" data-action="go" data-to="settings" aria-label="${esc(
        i18n.t('nav.settings'),
      )}">${icon('gear')}</button>
    </header>`;
}

function renderNav() {
  const items = [
    ['today', 'home', 'nav.today'],
    ['calendar', 'calendar', 'nav.calendar'],
    ['stats', 'chart', 'nav.stats'],
    ['settings', 'gear', 'nav.settings'],
  ];
  return `
    <nav class="nav" aria-label="${esc(i18n.t('app.name'))}">
      ${items
        .map(
          ([route, iconName, label]) => `
        <a class="nav__item" href="#/${route}" ${
          app.route === route ? 'aria-current="page"' : ''
        }>${icon(iconName)}<span>${esc(i18n.t(label))}</span></a>`,
        )
        .join('')}
    </nav>`;
}

function renderToast() {
  if (!app.toast) return '';
  return `
    <div class="toast" role="status" aria-live="polite">
      <span>${esc(app.toast.message)}</span>
      ${
        app.toast.actionLabel
          ? `<button class="toast__action" data-action="toast-undo">${esc(app.toast.actionLabel)}</button>`
          : ''
      }
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function onDocumentClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'go') {
    const to = el.dataset.to;
    if (to) {
      app.route = to;
      app.sheet = null;
      if (location.hash !== `#/${to}`) history.replaceState(null, '', `#/${to}`);
      window.scrollTo({ top: 0 });
      render();
    }
    return;
  }
  if (action === 'undo') {
    const restored = app.store.undo();
    if (restored) {
      app.model = restored;
      app.store.save(restored);
      refreshClock();
      render({ preserveScroll: true });
      showToast(i18n.t('common.undo'));
    }
    return;
  }
  if (action === 'toast-undo') {
    const restored = app.store.undo();
    if (restored) {
      app.model = restored;
      app.store.save(restored);
      refreshClock();
    }
    app.toast = null;
    render({ preserveScroll: true });
    return;
  }
  if (action === 'do-restore') {
    const payload = app.sheet?.payload;
    if (payload) performRestore(payload);
    return;
  }
  if (action === 'do-merge') {
    const payload = app.sheet?.payload;
    if (payload) performMerge(payload);
    return;
  }
  if (action === 'reload') {
    applyUpdate();
    return;
  }
  if (action === 'check-updates') {
    checkForUpdate().then((result) => {
      if (!result.checked) {
        showToast(i18n.t('update.unavailable'));
        return;
      }
      if (!result.found) showToast(i18n.t('update.upToDate'));
    });
    return;
  }
  if (action === 'close-sheet' || action === 'scrim-close') {
    closeSheet();
    return;
  }

  const handler = HANDLERS[action];
  if (handler) {
    event.preventDefault();
    handler(app, el, event);
  }
}

function onDocumentChange(event) {
  const el = event.target.closest('[data-change]');
  if (!el) return;
  const handler = CHANGE_HANDLERS[el.dataset.change];
  if (handler) handler(app, el, event);
}

function onDocumentInput(event) {
  const el = event.target.closest('[data-live]');
  if (!el) return;
  const handler = LIVE_HANDLERS[el.dataset.live];
  if (handler) handler(app, el, event);
}

function onKeyDown(event) {
  if (event.key === 'Escape' && app.sheet) closeSheet();
}

/* ------------------------------------------------------------------ */
/* Method surface used by screens                                      */
/* ------------------------------------------------------------------ */

Object.assign(app, {
  commit,
  render,
  openSheet,
  closeSheet,
  showToast,
  refreshClock,
  applyVisualPreferences,
  restoreBackup,
  replaceModel,
  computeDayFor,
});

export function todayIndex(prayer) {
  return slotIndex(app.today, prayer);
}

/* Exposed for debugging and for the screenshot tooling. */
if (typeof window !== 'undefined') {
  window.__qada = app;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
