/**
 * Civil-date arithmetic and timezone handling.
 *
 * Every date in the app is a proleptic-Gregorian civil date held either as
 * `{ y, m, d }` or as an ISO string `"YYYY-MM-DD"`. A *day number* is the
 * number of days since 1970-01-01 (UTC), which turns all calendar maths into
 * integer arithmetic and makes the prayer ledger indexable.
 *
 * No external timezone database is shipped: the platform's `Intl` API already
 * carries full historical DST rules, which is exactly what is needed to show
 * correct times for any location on any date.
 */

export const MS_DAY = 86400000;

/** Canonical prayer order. Subh is the first prayer of a normal day. */
export const PRAYERS = ['subh', 'dhuhr', 'asr', 'maghreb', 'isha'];

export const PRAYER_INDEX = { subh: 0, dhuhr: 1, asr: 2, maghreb: 3, isha: 4 };

export const SLOTS_PER_DAY = 5;

/** Prayer that opens a partially-obligated day (the day obligation begins). */
export const FIRST_OBLIGATION_PRAYER = 'dhuhr';

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y, m) {
  if (m < 1 || m > 12) return 30;
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function dayNumber(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / MS_DAY);
}

export function fromDayNumber(n) {
  const dt = new Date(n * MS_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function toISO({ y, m, d }) {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function fromISO(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new RangeError(`Invalid ISO date: ${iso}`);
  }
  return { y, m, d };
}

export function isISO(value) {
  try {
    fromISO(value);
    return true;
  } catch {
    return false;
  }
}

export function dayOfISO(iso) {
  const { y, m, d } = fromISO(iso);
  return dayNumber(y, m, d);
}

export function addDays(iso, delta) {
  return toISO(fromDayNumber(dayOfISO(iso) + delta));
}

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday. */
export function weekdayIndex(dayNum) {
  return (((dayNum + 4) % 7) + 7) % 7;
}

export function weekdayOf(iso) {
  const { y, m, d } = fromISO(iso);
  return weekdayIndex(dayNumber(y, m, d));
}

export function startOfMonth(iso) {
  const { y, m } = fromISO(iso);
  return toISO({ y, m, d: 1 });
}

export function endOfMonth(iso) {
  const { y, m } = fromISO(iso);
  return toISO({ y, m, d: daysInMonth(y, m) });
}

export function startOfYear(iso) {
  return toISO({ y: fromISO(iso).y, m: 1, d: 1 });
}

export function endOfYear(iso) {
  return toISO({ y: fromISO(iso).y, m: 12, d: 31 });
}

export function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function clampISO(iso, min, max) {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function yearsBetween(fromIso, toIso) {
  const a = fromISO(fromIso);
  const b = fromISO(toIso);
  let years = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) years -= 1;
  return years;
}

export function addYears(iso, years) {
  const { y, m, d } = fromISO(iso);
  const targetYear = y + years;
  return toISO({ y: targetYear, m, d: Math.min(d, daysInMonth(targetYear, m)) });
}

export function rangeDays(fromIso, toIsoInclusive) {
  const from = dayOfISO(fromIso);
  const to = dayOfISO(toIsoInclusive);
  return Math.max(0, to - from + 1);
}

/* ------------------------------------------------------------------ */
/* Timezone helpers (DST-correct, using the platform tz database)       */
/* ------------------------------------------------------------------ */

const partsFormatterCache = new Map();

function partsFormatter(tz) {
  let fmt = partsFormatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsFormatterCache.set(tz, fmt);
  }
  return fmt;
}

/** Wall-clock parts of an instant, as seen in `tz`. */
export function instantToLocalParts(instant, tz) {
  const parts = partsFormatter(tz).formatToParts(new Date(instant));
  const bag = {};
  for (const p of parts) if (p.type !== 'literal') bag[p.type] = p.value;
  return {
    y: Number(bag.year),
    m: Number(bag.month),
    d: Number(bag.day),
    hh: Number(bag.hour) % 24,
    mm: Number(bag.minute),
    ss: Number(bag.second),
  };
}

/** Offset of `tz` from UTC at a given instant, in minutes (east positive). */
export function tzOffsetMinutes(tz, instant) {
  const p = instantToLocalParts(instant, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return Math.round((asUtc - instant) / 60000);
}

/**
 * Convert a wall-clock time in `tz` into an instant.
 * Handles DST transitions by solving for the offset that actually applies.
 */
export function localToInstant(y, m, d, minutes, tz) {
  const wall = Date.UTC(y, m - 1, d, 0, 0) + minutes * 60000;
  let offset = tzOffsetMinutes(tz, wall);
  let instant = wall - offset * 60000;
  const corrected = tzOffsetMinutes(tz, instant);
  if (corrected !== offset) {
    offset = corrected;
    instant = wall - offset * 60000;
  }
  return instant;
}

/** Today's civil date in `tz`. */
export function todayIn(tz, now = Date.now()) {
  const p = instantToLocalParts(now, tz);
  return { y: p.y, m: p.m, d: p.d };
}

export function todayISO(tz, now = Date.now()) {
  return toISO(todayIn(tz, now));
}

/** Minutes since local midnight for an instant. */
export function minutesOfDayIn(instant, tz) {
  const p = instantToLocalParts(instant, tz);
  return p.hh * 60 + p.mm;
}

export function formatClock(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function parseClock(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}
