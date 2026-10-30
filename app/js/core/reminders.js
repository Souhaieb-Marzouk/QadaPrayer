/**
 * Reminder scheduling — pure logic, no browser APIs.
 *
 * The notifier turns these events into timers and notifications; keeping the
 * decision of *when* a reminder is due here means the rules are testable
 * without a DOM, a clock, or a permission prompt.
 */

import { PRAYERS } from './dates.js';

export const REMINDER_KINDS = { prayer: 'prayer', qada: 'qada' };

export const DEFAULT_REMINDERS = {
  enabled: false,
  subh: true,
  dhuhr: true,
  asr: true,
  maghreb: true,
  isha: true,
  qada: true,
  lead: 0,
  qadaHour: 20,
  quietFrom: 23,
  quietTo: 5,
  sound: true,
  vibrate: true,
};

export function normalizeReminders(raw) {
  const merged = { ...DEFAULT_REMINDERS, ...(raw || {}) };
  merged.lead = Math.max(0, Math.min(45, Math.round(Number(merged.lead) || 0)));
  merged.qadaHour = Math.max(0, Math.min(23, Math.round(Number(merged.qadaHour) || 0)));
  merged.quietFrom = Math.max(0, Math.min(23, Math.round(Number(merged.quietFrom) ?? 23)));
  merged.quietTo = Math.max(0, Math.min(23, Math.round(Number(merged.quietTo) ?? 5)));
  return merged;
}

/** True when `minutes` falls inside the quiet window (which may wrap midnight). */
export function inQuietHours(minutes, from, to) {
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  if (start < end) return m >= start && m < end;
  return m >= start || m < end;
}

/**
 * Build the ordered reminder queue.
 *
 * @param {object} input
 * @param {Array<{dateISO: string, windows: Record<string, {start:number,end:number}>}>} input.days
 *        today first, then the next day (both are needed to cover an overnight Subh)
 * @param {number} input.nowMinutes       minutes since local midnight, today
 * @param {object} input.settings         normalized reminder settings
 * @param {number} input.remaining        make-ups still owed (for the evening nudge)
 * @param {number} [input.limit]          safety cap on the queue size
 */
export function buildSchedule({ days, nowMinutes, settings, remaining, limit = 24 }) {
  const config = normalizeReminders(settings);
  if (!config.enabled || !Array.isArray(days) || days.length === 0) return [];

  const events = [];
  const todayISO = days[0].dateISO;
  // Settings store quiet hours as clock hours; the scheduler works in minutes.
  const quietFrom = config.quietFrom * 60;
  const quietTo = config.quietTo * 60;

  days.forEach((day, dayIndex) => {
    const offset = dayIndex * 1440;
    for (const prayer of PRAYERS) {
      if (!config[prayer]) continue;
      const window = day.windows?.[prayer];
      if (!window) continue;

      // A reminder never fires before midnight; an early Subh with a lead time
      // is simply pulled to 00:00 rather than dropped.
      const at = Math.max(0, window.start - config.lead) + offset;
      const delay = at - nowMinutes;
      if (delay <= 0) continue;
      if (inQuietHours(at, quietFrom, quietTo)) continue;

      events.push({
        key: `${day.dateISO}:${prayer}`,
        kind: REMINDER_KINDS.prayer,
        dateISO: day.dateISO,
        prayer,
        atMinutes: at,
        delayMinutes: delay,
        time: window.start,
      });
    }
  });

  if (config.qada && remaining > 0) {
    const at = config.qadaHour * 60;
    const delay = at - nowMinutes;
    if (delay > 0 && !inQuietHours(at, quietFrom, quietTo)) {
      events.push({
        key: `${todayISO}:qada`,
        kind: REMINDER_KINDS.qada,
        dateISO: todayISO,
        prayer: null,
        atMinutes: at,
        delayMinutes: delay,
        remaining,
      });
    }
  }

  return events.sort((a, b) => a.delayMinutes - b.delayMinutes).slice(0, limit);
}

/** Human-friendly "in 12 minutes" used by the settings screen. */
export function describeNext(events) {
  if (!events.length) return null;
  const next = events[0];
  return { kind: next.kind, prayer: next.prayer, delayMinutes: next.delayMinutes };
}
