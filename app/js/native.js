/**
 * Bridge to the Android widget.
 *
 * The installed app is a WebView: nothing native can read the ledger, which
 * lives in `localStorage`. So the page pushes a tiny, already-formatted snapshot
 * to a native bridge object; the widget only has to display three strings.
 *
 * In a plain browser `window.QadaNative` does not exist and every call here is a
 * no-op, which is why this module is safe to ship everywhere.
 */

import { t, number } from './i18n.js';
import { clock } from './ui/dom.js';
import { prayerStateAt } from './core/prayerTimes.js';

export const WIDGET_PREFS = 'qada_widget';

/** Build the strings the home-screen widget will show. */
export function buildSnapshot({ today, day, model, now, profileName = '', profiles = 1 }) {
  if (!model || !day) return null;

  const projection = model.projection(today);
  const plan = model.plan(today);
  const done = plan.items.filter((item) => item.mark === 1).length;
  const owed = plan.items.filter((item) => item.mark !== 2).length;

  const state = prayerStateAt(day, now);
  const nextKey = state.current || state.next;
  const nextAt = state.current ? day.windows[nextKey].end : day.windows[nextKey].start;

  const streak = model.streaks(today).current;
  const parts = [];
  if (profiles > 1 && profileName) parts.push(profileName);
  parts.push(`${t('today.progressToday')} ${done}/${owed}`);
  if (streak > 1) parts.push(`${streak}d`);

  return {
    headline: parts.join(' · '),
    big: number(projection.remaining),
    next: `${t(state.current ? 'today.now' : 'today.next')} ${t(`prayer.${nextKey}`)} · ${clock(
      nextAt,
    )}`,
    updated: clock(now),
    remaining: projection.remaining,
  };
}

/** Send the snapshot to the native side, if there is one. */
export function publishSnapshot(snapshot) {
  if (!snapshot) return false;

  // Always expose it on `window` first: the Android shell reads it with
  // EvaluateJavascript, which works even when the JS interface is unavailable.
  try {
    if (typeof window !== 'undefined') window.QadaWidgetData = snapshot;
  } catch {
    /* ignore */
  }

  try {
    const bridge = typeof window !== 'undefined' ? window.QadaNative : null;
    if (!bridge || typeof bridge.publish !== 'function') return false;
    bridge.publish(JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

/** True when the app is running inside the Android shell. */
export function hasNativeBridge() {
  return typeof window !== 'undefined' && Boolean(window.QadaNative);
}
