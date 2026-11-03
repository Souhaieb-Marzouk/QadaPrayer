/**
 * The Qada model.
 *
 * Design in one paragraph: every prayer of a lifetime is a *slot* identified by
 * an absolute integer `dayNumber * 5 + prayerIndex`. The ledger stores one mark
 * per slot (missed / done / exempt). Everything the user sees — the backlog
 * count, today's per-prayer make-up lists, the projected finish date — is
 * derived from that ledger plus the profile. Nothing is stored as "a plan", so
 * changing the daily frequency, marking an old day retroactively, or deferring
 * a make-up can never corrupt history: history is only the marks themselves.
 */

import {
  PRAYERS,
  PRAYER_INDEX,
  SLOTS_PER_DAY,
  addDays,
  dayOfISO,
  isISO,
  toISO,
  todayISO as computeTodayISO,
} from './dates.js';
import { decodeRuns, encodeRuns } from './rle.js';

export const MARK_MISSED = 0;
export const MARK_DONE = 1;
export const MARK_EXEMPT = 2;

export const STATE_VERSION = 1;

export const DEFAULT_PROFILE = {
  gender: 'male',
  pubertyDate: null,
  pubertySource: 'estimate',
  revertDate: null,
  regularSince: null,
  location: {
    name: 'Tunis',
    country: 'Tunisia',
    lat: 36.8065,
    lon: 10.1815,
    tz: 'Africa/Tunis',
  },
  method: 'tunisia',
  asrShadow: 1,
  offsets: { subh: 0, sunrise: 0, dhuhr: 0, asr: 0, maghreb: 0, isha: 0 },
  quotaPrayers: 5,
  language: 'en',
  theme: 'dark',
  textScale: 1,
  askBeforeDone: true,
  strictOrder: false,
  notifications: { enabled: false, subh: true, dhuhr: true, asr: true, maghreb: true, isha: true, qada: true, quietFrom: 23, quietTo: 5 },
  lock: { enabled: false, pinHash: null },
};

/** Number of make-ups the user aims for per day. */
export function quotaPrayers(profile) {
  const value = Number(profile?.quotaPrayers);
  if (!Number.isFinite(value)) return 5;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Split the daily quota across the five prayers, earliest prayers first. */
export function distributeQuota(quota) {
  const base = Math.floor(quota / SLOTS_PER_DAY);
  const remainder = quota % SLOTS_PER_DAY;
  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** First slot the user was ever obliged to pray (Dhuhr of the puberty day). */
export function owedStartIndex(profile) {
  if (!profile?.pubertyDate || !isISO(profile.pubertyDate)) return null;
  let start = dayOfISO(profile.pubertyDate) * SLOTS_PER_DAY + PRAYER_INDEX.dhuhr;
  if (profile.revertDate && isISO(profile.revertDate)) {
    start = Math.max(start, dayOfISO(profile.revertDate) * SLOTS_PER_DAY);
  }
  return start;
}

export function slotIndex(dateISO, prayer) {
  const day = dayOfISO(dateISO);
  const index = PRAYER_INDEX[prayer];
  if (index === undefined) throw new RangeError(`Unknown prayer: ${prayer}`);
  return day * SLOTS_PER_DAY + index;
}

export function slotDate(index) {
  const day = Math.floor(index / SLOTS_PER_DAY);
  return { dateISO: toISO(fromDateNumber(day)), prayer: PRAYERS[index % SLOTS_PER_DAY] };
}

function fromDateNumber(dayNumberValue) {
  const dt = new Date(dayNumberValue * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}


/** Hard limits for anything that arrives from a file, a backup or another phone. */
const MAX_RUNS = 200000;
const MAX_SLOTS = 400000; // roughly 219 years of five prayers
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Keep only plausible date keys and 5-bit masks — never let __proto__ through. */
function sanitizePauses(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;

  for (const [key, value] of Object.entries(raw)) {
    if (FORBIDDEN_KEYS.has(key) || !isISO(key)) continue;
    const mask = Number(value);
    if (Number.isInteger(mask) && mask >= 0 && mask < 32) clean[key] = mask;
  }
  return clean;
}

function clampProfile(profile) {
  const merged = {
    ...DEFAULT_PROFILE,
    ...profile,
    location: { ...DEFAULT_PROFILE.location, ...(profile?.location || {}) },
    offsets: { ...DEFAULT_PROFILE.offsets, ...(profile?.offsets || {}) },
    notifications: { ...DEFAULT_PROFILE.notifications, ...(profile?.notifications || {}) },
    lock: { ...DEFAULT_PROFILE.lock, ...(profile?.lock || {}) },
  };
  if (!isISO(merged.pubertyDate)) merged.pubertyDate = null;
  if (merged.revertDate && !isISO(merged.revertDate)) merged.revertDate = null;
  if (merged.regularSince && !isISO(merged.regularSince)) merged.regularSince = null;
  merged.quotaPrayers = quotaPrayers(merged);
  merged.asrShadow = merged.asrShadow === 2 ? 2 : 1;
  merged.textScale = Math.min(1.5, Math.max(0.85, Number(merged.textScale) || 1));
  if (!['en', 'fr', 'ar'].includes(merged.language)) merged.language = 'en';
  if (!['dark', 'light', 'sepia', 'night', 'auto'].includes(merged.theme)) merged.theme = 'dark';
  if (!['auto', 'arabic'].includes(merged.numerals)) merged.numerals = 'auto';

  // A profile can come from a file or another phone: keep it plausible.
  const lat = Number(merged.location.lat);
  const lon = Number(merged.location.lon);
  merged.location.lat = Number.isFinite(lat) ? Math.max(-90, Math.min(90, lat)) : DEFAULT_PROFILE.location.lat;
  merged.location.lon = Number.isFinite(lon)
    ? Math.max(-180, Math.min(180, lon))
    : DEFAULT_PROFILE.location.lon;
  merged.location.name =
    typeof merged.location.name === 'string' && merged.location.name.trim()
      ? merged.location.name.slice(0, 80)
      : DEFAULT_PROFILE.location.name;
  try {
    new Intl.DateTimeFormat('en', { timeZone: merged.location.tz });
  } catch {
    merged.location.tz = DEFAULT_PROFILE.location.tz;
  }
  if (typeof merged.method !== 'string' || merged.method.length > 32) {
    merged.method = DEFAULT_PROFILE.method;
  }
  return merged;
}

export class Qada {
  constructor(data, ledger, today) {
    this.data = data;
    this.ledger = ledger;
    this.today = today;
  }

  /* ---------------------------------------------------------------- */
  /* Construction                                                      */
  /* ---------------------------------------------------------------- */

  static ledgerSize(today) {
    return (dayOfISO(today) + 3) * SLOTS_PER_DAY;
  }

  static create(profile, today = computeTodayISO('UTC')) {
    const data = {
      v: STATE_VERSION,
      profile: clampProfile(profile),
      marks: null,
      pauses: {},
      log: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ledger = new Uint8Array(Qada.ledgerSize(today));
    return new Qada(data, ledger, today);
  }

  static fromJSON(raw, today = computeTodayISO('UTC')) {
    if (!raw || typeof raw !== 'object') throw new TypeError('Backup is not an object');
    if (raw.v !== STATE_VERSION) {
      if (typeof raw.v === 'number' && raw.v > STATE_VERSION) {
        throw new Error('This backup was created by a newer version of the app.');
      }
    }
    const data = {
      v: STATE_VERSION,
      profile: clampProfile(raw.profile),
      marks: Array.isArray(raw.marks) ? raw.marks.slice(0, MAX_RUNS) : [],
      pauses: sanitizePauses(raw.pauses),
      log: Array.isArray(raw.log)
        ? raw.log.filter((entry) => entry && typeof entry === 'object').slice(-200)
        : [],
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
    const runTotal = data.marks.reduce(
      (sum, run) => sum + (Number(run?.[1]) || 0),
      0,
    );
    const size = Math.min(Math.max(Qada.ledgerSize(today), runTotal), MAX_SLOTS);
    const ledger = decodeRuns(data.marks, size);
    const model = new Qada(data, ledger, today);
    model.ensureCapacity(dayOfISO(today) * SLOTS_PER_DAY + SLOTS_PER_DAY);
    return model;
  }

  toJSON() {
    this.ensureCapacity(Math.max(0, this.startIndex ?? 0));
    return {
      ...this.data,
      marks: encodeRuns(this.ledger, this.ledger.length),
      updatedAt: new Date().toISOString(),
    };
  }

  clone() {
    return Qada.fromJSON(this.toJSON(), this.today);
  }

  /* ---------------------------------------------------------------- */
  /* Basics                                                            */
  /* ---------------------------------------------------------------- */

  get profile() {
    return this.data.profile;
  }

  setToday(today) {
    this.today = today;
    this.ensureCapacity(dayOfISO(today) * SLOTS_PER_DAY + SLOTS_PER_DAY * 2);
  }

  get startIndex() {
    return owedStartIndex(this.data.profile);
  }

  get endOfToday() {
    return dayOfISO(this.today) * SLOTS_PER_DAY + SLOTS_PER_DAY - 1;
  }

  endOfDay(dateISO) {
    return dayOfISO(dateISO) * SLOTS_PER_DAY + SLOTS_PER_DAY - 1;
  }

  backlogEnd(dateISO = this.today) {
    return this.endOfDay(addDays(dateISO, -1));
  }

  ensureCapacity(index) {
    if (index < this.ledger.length) return;
    const next = new Uint8Array(Math.ceil((index + SLOTS_PER_DAY) / SLOTS_PER_DAY) * SLOTS_PER_DAY);
    next.set(this.ledger);
    this.ledger = next;
  }

  get(index) {
    if (index < 0 || index >= this.ledger.length) return MARK_MISSED;
    return this.ledger[index];
  }

  set(index, value) {
    this.ensureCapacity(index);
    this.ledger[index] = value;
  }

  isOwed(index) {
    const start = this.startIndex;
    if (start === null) return false;
    return index >= start && index <= this.endOfToday;
  }

  /* ---------------------------------------------------------------- */
  /* Queries                                                           */
  /* ---------------------------------------------------------------- */

  /** Count of owed / done / exempt slots between two indices (inclusive). */
  countRange(start, end) {
    if (start === null || end < start) return { total: 0, done: 0, exempt: 0 };
    let total = 0;
    let done = 0;
    let exempt = 0;
    const last = Math.min(end, this.ledger.length - 1);
    for (let i = start; i <= last; i += 1) {
      const value = this.ledger[i];
      if (value === MARK_EXEMPT) exempt += 1;
      else {
        total += 1;
        if (value === MARK_DONE) done += 1;
      }
    }
    return { total, done, exempt };
  }

  /** Backlog statistics: everything owed before today. */
  stats(today = this.today) {
    const start = this.startIndex;
    if (start === null) {
      return { total: 0, done: 0, exempt: 0, remaining: 0, progress: 1 };
    }
    const end = this.backlogEnd(today);
    const { total, done, exempt } = this.countRange(start, end);
    const remaining = Math.max(0, total - done);
    return {
      total,
      done,
      exempt,
      remaining,
      progress: total === 0 ? 1 : done / total,
    };
  }

  /** First `limit` make-up slots that are still owed, oldest first. */
  firstUndone(start, end, limit) {
    const out = [];
    if (start === null || limit <= 0) return out;
    const last = Math.min(end, this.ledger.length - 1);
    for (let i = start; i <= last && out.length < limit; i += 1) {
      if (this.ledger[i] === MARK_MISSED) out.push(i);
    }
    return out;
  }

  /** Marks of the five slots of a day. */
  dayMarks(dateISO) {
    return PRAYERS.map((prayer) => this.get(slotIndex(dateISO, prayer)));
  }

  dayStatus(dateISO) {
    if (this.data.profile.pubertyDate && dateISO < this.data.profile.pubertyDate) {
      return 'before';
    }
    if (dateISO > this.today) return 'future';
    let owed = 0;
    let done = 0;
    for (const prayer of PRAYERS) {
      const index = slotIndex(dateISO, prayer);
      if (!this.isOwed(index)) continue;
      const mark = this.get(index);
      if (mark === MARK_EXEMPT) continue;
      owed += 1;
      if (mark === MARK_DONE) done += 1;
    }
    if (owed === 0) return 'exempt';
    if (done === 0) return 'missed';
    if (done === owed) return 'done';
    return 'partial';
  }

  /* ---------------------------------------------------------------- */
  /* Today's plan                                                      */
  /* ---------------------------------------------------------------- */

  isPaused(dateISO, prayerIndex) {
    const mask = this.data.pauses?.[dateISO];
    return Number.isInteger(mask) ? ((mask >> prayerIndex) & 1) === 1 : false;
  }

  /** Bitmask of prayers whose make-up list is suppressed for a date. */
  pausedMask(dateISO) {
    const mask = this.data.pauses?.[dateISO];
    return Number.isInteger(mask) ? mask : 0;
  }

  /**
   * Assignment of make-ups to the five prayers of a date.
   * Only meaningful for today and future dates: the past is read from marks.
   */
  plan(dateISO = this.today) {
    const quota = quotaPrayers(this.data.profile);
    const perPrayer = distributeQuota(quota);
    // A prayer that is already completed for the day no longer carries any
    // make-up: whatever the user confirmed when marking it was consumed then.
    const capacities = perPrayer.map((value, index) => {
      if (this.get(slotIndex(dateISO, PRAYERS[index])) === MARK_DONE) return 0;
      return this.isPaused(dateISO, index) ? 0 : value;
    });
    const need = capacities.reduce((a, b) => a + b, 0);
    const queue = this.firstUndone(this.startIndex, this.backlogEnd(dateISO), need);

    let cursor = 0;
    const items = PRAYERS.map((prayer, index) => {
      const capacity = capacities[index];
      const take = Math.min(capacity, queue.length - cursor);
      const assigned = queue.slice(cursor, cursor + take);
      cursor += take;
      return {
        prayer,
        index: slotIndex(dateISO, prayer),
        capacity,
        mark: this.get(slotIndex(dateISO, prayer)),
        qada: assigned,
      };
    });

    const stats = this.stats(this.today);
    return {
      dateISO,
      quota,
      pausedMask: this.pausedMask(dateISO),
      items,
      assigned: cursor,
      remainingBefore: stats.remaining,
      remainingAfter: Math.max(0, stats.remaining - cursor),
    };
  }

  /* ---------------------------------------------------------------- */
  /* Mutations                                                         */
  /* ---------------------------------------------------------------- */

  touch() {
    this.data.updatedAt = new Date().toISOString();
  }

  log(entry) {
    this.data.log.push({ ...entry, at: new Date().toISOString() });
    if (this.data.log.length > 200) this.data.log.splice(0, this.data.log.length - 200);
  }

  setMark(dateISO, prayer, value) {
    const index = slotIndex(dateISO, prayer);
    if (!this.isOwed(index)) return false;
    this.set(index, value);
    this.touch();
    return true;
  }

  markMany(indices, value = MARK_DONE) {
    let marked = 0;
    for (const index of indices) {
      if (!this.isOwed(index)) continue;
      this.set(index, value);
      marked += 1;
    }
    if (marked) this.touch();
    return marked;
  }

  /**
   * Set the exact marks chosen in the prayer sheet: the prayer itself and every
   * make-up listed under it, including un-marking ones that were done before.
   * `self` and each entry of `qada` are a mark value (done / missed).
   */
  applySelection({ dateISO, prayer, self, qada = {} }) {
    const index = slotIndex(dateISO, prayer);
    let touched = 0;

    if (self !== undefined && this.isOwed(index) && this.get(index) !== self) {
      this.set(index, self);
      touched += 1;
    }

    for (const [key, value] of Object.entries(qada)) {
      const slot = Number(key);
      if (!Number.isInteger(slot) || !this.isOwed(slot)) continue;
      if (this.get(slot) === value) continue;
      this.set(slot, value);
      touched += 1;
    }

    if (touched) {
      this.log({ kind: 'selection', dateISO, prayer, changes: touched });
      this.touch();
    }
    return touched;
  }

  /** The make-ups that were marked done under a given prayer, most recent first. */
  lastQadaIndices(dateISO, prayer) {
    const log = this.data.log || [];
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const entry = log[index];
      if (entry.kind === 'prayed' && entry.dateISO === dateISO && entry.prayer === prayer) {
        return Array.isArray(entry.indices) ? entry.indices : [];
      }
    }
    return [];
  }

  /** Undo pauseDay: the day plans its make-ups again. */
  resumeDay(dateISO) {
    delete this.data.pauses[dateISO];
    this.touch();
  }

  /** Move every make-up still owed today to the next day. */
  pauseDay(dateISO) {
    this.data.pauses[dateISO] = (1 << SLOTS_PER_DAY) - 1;
    this.log({ kind: 'defer', mode: 'tomorrow', dateISO, prayer: null });
    this.touch();
  }

  /** Move everything planned under one prayer of `dateISO` to the next day. */
  pausePrayer(dateISO, prayer) {
    const index = PRAYER_INDEX[prayer];
    if (index === undefined) return;
    this.data.pauses[dateISO] = this.pausedMask(dateISO) | (1 << index);
    this.log({ kind: 'defer', mode: 'tomorrow', dateISO, prayer });
    this.touch();
  }

  /**
   * Mark every owed slot in an inclusive date range.
   * Dates are clamped to the owed window; future dates are refused.
   */
  markRange(fromDate, toDate, value = MARK_DONE, options = {}) {
    const start = this.startIndex;
    if (start === null) return 0;
    const yesterday = addDays(this.today, -1);
    const cappedTo = options.includeToday || toDate < yesterday ? toDate : yesterday;
    if (cappedTo < fromDate) return 0;
    const from = Math.max(start, dayOfISO(fromDate) * SLOTS_PER_DAY);
    const to = Math.min(this.endOfToday, this.endOfDay(cappedTo));
    if (to < from) return 0;
    let count = 0;
    for (let i = from; i <= to; i += 1) {
      // An excused day (haydh) is never overwritten by a bulk "done".
      if (options.skipExempt && value === MARK_DONE && this.get(i) === MARK_EXEMPT) continue;
      this.ledger[i] = value;
      count += 1;
    }
    this.touch();
    this.log({ kind: 'range', from: fromDate, to: cappedTo, value, count });
    return count;
  }

  /**
   * Record the outcome of a prayer the user was shown.
   * `defer` is 'none' | 'next' | 'tomorrow' and only matters when not prayed.
   */
  applyOutcome({ dateISO, prayer, prayed, qadaIndices = [], defer = 'none' }) {
    const prayerIndex = PRAYER_INDEX[prayer];
    const index = slotIndex(dateISO, prayer);
    if (prayed) {
      if (this.isOwed(index)) this.set(index, MARK_DONE);
      this.markMany(qadaIndices, MARK_DONE);
      this.log({ kind: 'prayed', dateISO, prayer, qada: qadaIndices.length, indices: [...qadaIndices] });
    } else {
      const mask = this.pausedMask(dateISO);
      const bits = defer === 'tomorrow'
        ? ((1 << SLOTS_PER_DAY) - 1) ^ ((1 << prayerIndex) - 1)
        : 1 << prayerIndex;
      this.data.pauses[dateISO] = mask | bits;
      this.log({ kind: 'defer', mode: defer, dateISO, prayer });
    }
    this.touch();
  }

  clearPause(dateISO) {
    if (this.data.pauses?.[dateISO] !== undefined) {
      delete this.data.pauses[dateISO];
      this.touch();
    }
  }

  setQuota(prayers) {
    this.data.profile.quotaPrayers = quotaPrayers({ quotaPrayers: prayers });
    this.touch();
  }

  updateProfile(patch) {
    this.data.profile = clampProfile({ ...this.data.profile, ...patch });
    this.touch();
  }

  /**
   * Onboarding shortcut: "I have been praying regularly since <date>".
   * Everything owed from that date until yesterday is marked done.
   */
  applyRegularSince(dateISO) {
    if (!isISO(dateISO)) return 0;
    const start = this.startIndex;
    if (start === null) return 0;
    const yesterday = addDays(this.today, -1);
    if (dateISO > yesterday) return 0;
    const from = Math.max(start, dayOfISO(dateISO) * SLOTS_PER_DAY);
    const to = this.backlogEnd(this.today);
    let count = 0;
    for (let i = from; i <= to; i += 1) {
      if (this.ledger[i] === MARK_MISSED) {
        this.ledger[i] = MARK_DONE;
        count += 1;
      }
    }
    this.touch();
    this.log({ kind: 'regular-since', dateISO, count });
    return count;
  }

  /* ---------------------------------------------------------------- */
  /* Projections                                                       */
  /* ---------------------------------------------------------------- */

  /** Days until the backlog is cleared at the current pace. */
  projection(today = this.today) {
    const stats = this.stats(today);
    const quota = quotaPrayers(this.data.profile);
    const net = quota - SLOTS_PER_DAY;
    const atPace = quota > 0 ? Math.ceil(stats.remaining / quota) : Infinity;
    const finishDate =
      Number.isFinite(atPace) && atPace < 365 * 200 ? addDays(today, atPace) : null;
    return {
      ...stats,
      quota,
      net,
      daysAtPace: Number.isFinite(atPace) ? atPace : null,
      finishDate,
      yearsAtPace: Number.isFinite(atPace) ? atPace / 365.25 : null,
    };
  }

  /** Completion ratio of the five daily prayers over the last `days` days. */
  recentActivity(today = this.today, days = 7) {
    const out = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const dateISO = addDays(today, -offset);
      out.push({ dateISO, ...this.dayTally(dateISO) });
    }
    return out;
  }

  /** Owed / done / exempt prayers of a single day. */
  dayTally(dateISO) {
    let owed = 0;
    let done = 0;
    let exempt = 0;
    for (const prayer of PRAYERS) {
      const index = slotIndex(dateISO, prayer);
      if (!this.isOwed(index)) continue;
      const mark = this.get(index);
      if (mark === MARK_EXEMPT) {
        exempt += 1;
        continue;
      }
      owed += 1;
      if (mark === MARK_DONE) done += 1;
    }
    return { owed, done, exempt };
  }

  /**
   * Consecutive days on which every owed prayer was prayed.
   *
   * A day with nothing owed (exempt, or before the obligation) neither breaks
   * nor extends the run. Today is not counted against you while it is still in
   * progress: if it is complete it is added, if not the streak simply keeps the
   * value it had yesterday.
   */
  streaks(today = this.today) {
    const start = this.startIndex;
    if (start === null) return { current: 0, best: 0 };

    const firstDay = Math.floor(start / SLOTS_PER_DAY);
    const yesterday = dayOfISO(addDays(today, -1));

    let run = 0;
    let best = 0;

    for (let day = firstDay; day <= yesterday; day += 1) {
      const tally = this.dayTally(toISO(fromDateNumber(day)));
      if (tally.owed === 0) continue;
      if (tally.done === tally.owed) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }

    const todayTally = this.dayTally(today);
    let current = run;
    if (todayTally.owed > 0 && todayTally.done === todayTally.owed) {
      current = run + 1;
      if (current > best) best = current;
    }

    return { current, best };
  }

  /** Totals over an inclusive date range (used by the weekly/monthly review). */
  rangeSummary(fromDate, toDate) {
    const from = dayOfISO(fromDate);
    const to = dayOfISO(toDate);
    const summary = { days: 0, complete: 0, partial: 0, missed: 0, exempt: 0, owed: 0, done: 0 };

    for (let day = from; day <= to; day += 1) {
      const tally = this.dayTally(toISO(fromDateNumber(day)));
      summary.days += 1;
      summary.owed += tally.owed;
      summary.done += tally.done;
      if (tally.owed === 0) summary.exempt += 1;
      else if (tally.done === tally.owed) summary.complete += 1;
      else if (tally.done === 0) summary.missed += 1;
      else summary.partial += 1;
    }

    return summary;
  }

  /**
   * "I prayed extra make-ups": consume the oldest N owed prayers from the queue.
   * Returns the slots that were marked, so the UI can offer an undo.
   */
  markNextMakeUps(count, today = this.today) {
    const howMany = Math.max(0, Math.min(500, Math.floor(Number(count) || 0)));
    if (howMany === 0) return [];

    const indices = this.firstUndone(this.startIndex, this.backlogEnd(today), howMany);
    if (!indices.length) return [];

    this.markMany(indices, MARK_DONE);
    this.log({ kind: 'extra', count: indices.length });
    return indices;
  }
}
