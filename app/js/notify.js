/**
 * Reminder delivery — the thin browser layer around the pure scheduler.
 *
 * Everything here is best effort by nature: a web app can only fire while it is
 * alive, and browsers throttle background timers. The UI says so plainly. What
 * this module guarantees is that when the app *is* running, a due reminder is
 * shown once, with sound and vibration, and the queue re-arms itself.
 */

import { t } from './i18n.js';
import { addDays, fromISO, toISO } from './core/dates.js';
import { computeDay } from './core/prayerTimes.js';
import { buildSchedule, normalizeReminders } from './core/reminders.js';

let timer = null;
let audio = null;
const shown = new Set();
const dayCache = new Map();

/* ------------------------------------------------------------------ */
/* Capability                                                          */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Android shell                                                        */
/* ------------------------------------------------------------------ */

/**
 * Inside the apk the page cannot post notifications: the WebView has no
 * notification permission and no way to ask for one. The shell owns them, so
 * the page hands it the schedule instead.
 */
function inShell() {
  try {
    return new URLSearchParams(window.location.search).has('apk');
  } catch {
    return false;
  }
}

function shellLink(path, params = {}) {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  try {
    window.location.href = `qadaprayer://${path}${query ? `?${query}` : ''}`;
  } catch {
    /* ignore */
  }
}

let lastNativePayload = '';

/** Send the upcoming reminders to the shell, at most when the list changes. */
function scheduleNative(app) {
  if (!app?.model || !app.day) return null;

  const settings = normalizeReminders(app.model.profile.notifications);
  if (!settings.enabled) {
    if (lastNativePayload !== '[]') {
      lastNativePayload = '[]';
      shellLink('remind', { data: encodeBase64('[]') });
    }
    return null;
  }

  const events = nextEvents(app, 12).map((event) => {
    const at = Date.now() + Math.max(0, event.delayMinutes) * 60000;
    const title =
      event.kind === 'qada'
        ? t('notify.qadaTitle')
        : t('notify.prayerTitle', {
            prayer: t(`prayer.${event.prayer}`),
            time: formatClock(event.time),
          });
    const body =
      event.kind === 'qada'
        ? t('notify.qadaBody', { count: event.remaining })
        : t('notify.prayerBody', { prayer: t(`prayer.${event.prayer}`) });

    return { at, title, body };
  });

  const payload = encodeBase64(JSON.stringify(events));
  if (payload === lastNativePayload) return events[0] || null;
  lastNativePayload = payload;
  shellLink('remind', { data: payload });
  return events[0] || null;
}

function encodeBase64(value) {
  try {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  } catch {
    return '';
  }
}

export function supported() {
  if (inShell()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permission() {
  if (inShell()) return 'granted';
  if (!supported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (inShell()) {
    // The system dialog belongs to Android, not to the page.
    shellLink('notify-permission');
    return 'granted';
  }
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Must be called from a user gesture, otherwise browsers keep audio blocked. */
export function primeAudio() {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    if (!audio) audio = new Ctor();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

let soundId = 'chime';

/** 'chime' | 'bell' | 'none' — set from the profile when preferences change. */
export function setSound(id) {
  soundId = ['chime', 'bell', 'none'].includes(id) ? id : 'chime';
}

function chime() {
  if (soundId === 'none') return;
  const tones = soundId === 'bell' ? [523.25, 392] : [880, 1174.66];
  if (!audio) return;
  try {
    const start = audio.currentTime;
    tones.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const at = start + index * 0.22;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.65);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.7);
    });
  } catch {
    /* audio is a nicety, never a failure */
  }
}

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

export async function show({ title, body, tag, data }) {
  const canAct = (() => {
    try {
      return (Notification.maxActions || 0) > 0;
    } catch {
      return false;
    }
  })();

  // Where action buttons do not exist (iOS, most desktops), tell the user that a
  // tap is enough — and keep the body short enough not to be truncated.
  let text = body;
  if (!canAct && data?.prayer && body && body.length < 90) {
    text = `${body} · ${t('notify.tapToMark')}`;
  }

  const options = {
    body: text,
    tag,
    data: data?.prayer
      ? { ...data, url: `./?mark=${data.dateISO}:${data.prayer}` }
      : data,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    silent: true, // we play our own chime so it also works on desktop
  };

  // Action buttons ("I prayed") exist on Android/Chrome; other platforms
  // silently ignore the field, so it is always safe to send.
  if (canAct) {
    options.actions = [
      { action: 'prayed', title: t('notify.actionPrayed') },
      { action: 'later', title: t('notify.actionLater') },
    ];
  }

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return true;
    }
  } catch {
    /* fall through to the constructor */
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

export function cancelReminders() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function dayFor(app, dateISO) {
  if (dayCache.has(dateISO)) return dayCache.get(dateISO);
  const p = app.model.profile;
  const day = computeDay({
    dateISO,
    lat: p.location.lat,
    lon: p.location.lon,
    tz: p.location.tz,
    method: p.method,
    asrShadow: p.asrShadow,
    offsets: p.offsets,
  });
  if (dayCache.size > 8) dayCache.clear();
  dayCache.set(dateISO, day);
  return day;
}

export function nextEvents(app, limit = 24) {
  if (!app?.model || !app.day) return [];
  const settings = normalizeReminders(app.model.profile.notifications);
  if (!settings.enabled || permission() !== 'granted') return [];

  const tomorrowISO = addDays(app.today, 1);
  const events = buildSchedule({
    days: [
      { dateISO: app.today, windows: app.day.windows },
      { dateISO: tomorrowISO, windows: dayFor(app, tomorrowISO).windows },
    ],
    nowMinutes: app.now,
    settings,
    remaining: app.model.stats(app.today).remaining,
    limit,
  });

  return events.filter((event) => !shown.has(event.key));
}

function formatClock(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function fire(app, event) {
  const settings = normalizeReminders(app.model.profile.notifications);
  if (shown.has(event.key)) return;
  shown.add(event.key);
  if (shown.size > 120) shown.clear();

  let title;
  let body;
  if (event.kind === 'qada') {
    title = t('notify.qadaTitle');
    body = t('notify.qadaBody', { count: event.remaining });
  } else {
    title = t('notify.prayerTitle', {
      prayer: t(`prayer.${event.prayer}`),
      time: formatClock(event.time),
    });
    body = t('notify.prayerBody', { prayer: t(`prayer.${event.prayer}`) });
  }

  show({
    title,
    body,
    tag: event.key,
    data: { kind: event.kind, prayer: event.prayer, dateISO: event.dateISO },
  });
  if (settings.sound) chime();
  if (settings.vibrate) vibrate([180, 90, 180]);

  scheduleReminders(app);
}

/** Re-arm the timer for the next due reminder. Safe to call as often as needed. */
export function scheduleReminders(app) {
  if (inShell()) return scheduleNative(app);
  cancelReminders();
  const events = nextEvents(app);
  if (!events.length) return null;

  const next = events[0];
  const delay = Math.max(400, next.delayMinutes * 60000);
  timer = setTimeout(() => fire(app, next), delay);
  return next;
}

/** Fire a sample notification right now, from a user gesture. */
export async function sendTest(app) {
  const settings = normalizeReminders(app?.model?.profile?.notifications);

  // In the shell a web notification would go nowhere: fire a real alarm instead,
  // thirty seconds out, through the same path the prayer reminders use.
  if (inShell()) {
    shellLink('remind-test', { in: 30 });
    return true;
  }

  if (settings.sound) chime();
  if (settings.vibrate) vibrate([120, 60, 120]);
  return show({
    title: t('notify.testTitle'),
    body: t('notify.testBody'),
    tag: 'qada:test',
    data: { kind: 'test' },
  });
}

/** Reset the "already shown" memory — used when the day changes. */
/** Re-show a reminder ten minutes later (the "later" action). */
export function snoozeFrom(app, data, minutes = 10) {
  setTimeout(() => {
    show({
      title: data.title || t('app.name'),
      body: data.body || '',
      tag: 'snooze',
      data: { kind: 'snooze', prayer: data.prayer, dateISO: data.dateISO },
    });
    chime();
    vibrate([80]);
  }, minutes * 60 * 1000);

  app?.showToast?.(t('notify.snoozed'));
}

export function resetShown() {
  shown.clear();
}

/** Exported for tests: date helpers used by the notifier. */
export const _internal = { fromISO, toISO, dayCache };
