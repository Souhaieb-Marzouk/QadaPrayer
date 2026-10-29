/**
 * Prayer time calculation.
 *
 * Times are returned as "minutes after local midnight" for the requested civil
 * date, so they are directly comparable with the phone clock and with each
 * other. Nothing here touches the network: the same coordinates and date always
 * produce the same timetable, which is what makes the ledger reproducible.
 *
 * Every event is solved iteratively: the sun's declination is re-evaluated at
 * the moment of the event instead of at noon, which keeps the result within a
 * few seconds of published timetables. Times are rounded *up* so a window never
 * opens before the astronomical truth.
 */

import { addDays, dayOfISO, fromISO, localToInstant, tzOffsetMinutes } from './dates.js';
import {
  hourAngleForAltitude,
  julianDay,
  solarPosition,
  asrAltitude,
} from './astro.js';

/** Twilight conventions. Angles are degrees below the horizon. */
export const METHODS = {
  tunisia: { fajr: 18, isha: 18, id: 'tunisia' },
  mwl: { fajr: 18, isha: 17, id: 'mwl' },
  egypt: { fajr: 19.5, isha: 17.5, id: 'egypt' },
  karachi: { fajr: 18, isha: 18, id: 'karachi' },
  dubai: { fajr: 18.2, isha: 18.2, id: 'dubai' },
  isna: { fajr: 15, isha: 15, id: 'isna' },
  france: { fajr: 12, isha: 12, id: 'france' },
  ummAlQura: { fajr: 18.5, isha: null, ishaInterval: 90, id: 'ummAlQura' },
  custom: { fajr: 18, isha: 17, id: 'custom' },
};

export const METHOD_IDS = Object.keys(METHODS);

const HORIZON = -0.833; // refraction + solar semi-diameter
const DHUHR_PADDING = 1; // minutes of safety after true solar noon

function ceilMinutes(value) {
  return Math.ceil(value - 1e-9);
}

function twilightParams(options) {
  const method = METHODS[options.method] || METHODS.tunisia;
  const fajr = Number.isFinite(options.fajrAngle) ? options.fajrAngle : method.fajr;
  const isha = Number.isFinite(options.ishaAngle) ? options.ishaAngle : method.isha;
  let ishaInterval = null;
  if (isha === null || isha === undefined) {
    ishaInterval = options.ishaInterval ?? method.ishaInterval ?? 90;
  }
  return {
    fajr,
    isha,
    ishaInterval,
    asrShadow: options.asrShadow === 2 ? 2 : 1,
  };
}

/**
 * Compute the five prayer times plus sunrise for one civil date.
 *
 * @param {object} input
 * @param {string} input.dateISO   civil date, "YYYY-MM-DD"
 * @param {number} input.lat       latitude, degrees north
 * @param {number} input.lon       longitude, degrees east
 * @param {string} input.tz        IANA timezone
 */
export function computeTimes({
  dateISO,
  lat,
  lon,
  tz,
  method = 'tunisia',
  asrShadow = 1,
  fajrAngle,
  ishaAngle,
  ishaInterval,
  offsets = {},
}) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`Invalid latitude: ${lat}`);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new RangeError(`Invalid longitude: ${lon}`);
  }

  const { y, m, d } = fromISO(dateISO);
  const params = twilightParams({ method, fajrAngle, ishaAngle, ishaInterval, asrShadow });

  const approximateNoon = Date.UTC(y, m - 1, d, 12, 0) - lon * 4 * 60000;
  const { declination: noonDeclination, equationOfTime } = solarPosition(
    julianDay(approximateNoon),
  );
  const solarNoonUtcMinutes = 720 - 4 * lon - equationOfTime;
  const noonInstant = Date.UTC(y, m - 1, d, 0, 0) + solarNoonUtcMinutes * 60000;
  const tzOffset = tzOffsetMinutes(tz, noonInstant);
  const noonLocal = solarNoonUtcMinutes + tzOffset;

  /**
   * Solve for the local minute at which the sun sits at `altitude(decl)`.
   * `sign` is -1 for morning events, +1 for evening events.
   */
  const solve = (sign, altitudeOf) => {
    let declination = noonDeclination;
    let minutes = null;
    for (let step = 0; step < 4; step += 1) {
      const angle = hourAngleForAltitude(lat, declination, altitudeOf(declination));
      if (angle === null) return null;
      minutes = noonLocal + sign * angle * 4;
      const instant = localToInstant(y, m, d, minutes, tz);
      declination = solarPosition(julianDay(instant)).declination;
    }
    return minutes;
  };

  let subh = solve(-1, () => -params.fajr);
  let sunrise = solve(-1, () => HORIZON);
  let maghreb = solve(1, () => HORIZON);
  let asr = solve(1, (decl) => asrAltitude(lat, decl, params.asrShadow));
  let isha =
    params.ishaInterval === null ? solve(1, () => -params.isha) : null;

  let highLatitude = false;

  // High-latitude fallbacks: one seventh of the night from each horizon.
  if (subh === null || isha === null || sunrise === null || maghreb === null) {
    highLatitude = true;
    const fallbackSunrise = sunrise ?? noonLocal - 360;
    const fallbackSunset = maghreb ?? noonLocal + 360;
    const night = 1440 - (fallbackSunset - fallbackSunrise);
    sunrise = fallbackSunrise;
    maghreb = fallbackSunset;
    if (subh === null) subh = sunrise - night / 7;
    if (isha === null && params.ishaInterval === null) isha = maghreb + night / 7;
    if (asr === null) asr = noonLocal + (maghreb - noonLocal) * 0.6;
  }

  if (isha === null) isha = maghreb + (params.ishaInterval ?? 90);

  const clampDay = (value) => Math.min(1439, Math.max(0, value));
  const offsetOf = (key) => Number(offsets[key]) || 0;

  let times = {
    subh: clampDay(ceilMinutes(subh) + offsetOf('subh')),
    sunrise: clampDay(ceilMinutes(sunrise) + offsetOf('sunrise')),
    dhuhr: clampDay(ceilMinutes(noonLocal + DHUHR_PADDING) + offsetOf('dhuhr')),
    asr: clampDay(ceilMinutes(asr) + offsetOf('asr')),
    maghreb: clampDay(ceilMinutes(maghreb) + offsetOf('maghreb')),
    isha: clampDay(ceilMinutes(isha) + offsetOf('isha')),
  };

  times = enforceOrder(times);

  return {
    dateISO,
    times,
    meta: {
      method: params.ishaInterval === null ? method : 'interval',
      asrShadow: params.asrShadow,
      highLatitude,
      tzOffset,
    },
  };
}

const ORDER = ['subh', 'sunrise', 'dhuhr', 'asr', 'maghreb', 'isha'];

function enforceOrder(times) {
  const out = { ...times };
  for (let i = 1; i < ORDER.length; i += 1) {
    const prev = out[ORDER[i - 1]];
    if (out[ORDER[i]] <= prev) out[ORDER[i]] = prev + 1;
  }
  const overflow = out.isha - 1439;
  if (overflow > 0) {
    for (const key of ORDER) out[key] = Math.max(0, out[key] - overflow);
    for (let i = 1; i < ORDER.length; i += 1) {
      if (out[ORDER[i]] <= out[ORDER[i - 1]]) out[ORDER[i]] = out[ORDER[i - 1]] + 1;
    }
  }
  return out;
}

/**
 * Prayer windows for a date: when each obligation opens and closes.
 * `isha` closes at the next day's Subh, expressed in this day's minutes
 * (so it can exceed 1440).
 */
export function computeDay(input) {
  const today = computeTimes(input);
  const tomorrow = computeTimes({ ...input, dateISO: addDays(input.dateISO, 1) });
  return {
    dateISO: input.dateISO,
    times: today.times,
    windows: {
      subh: { start: today.times.subh, end: today.times.sunrise },
      dhuhr: { start: today.times.dhuhr, end: today.times.asr },
      asr: { start: today.times.asr, end: today.times.maghreb },
      maghreb: { start: today.times.maghreb, end: today.times.isha },
      isha: { start: today.times.isha, end: tomorrow.times.subh + 1440 },
    },
    tomorrowSubh: tomorrow.times.subh,
    meta: today.meta,
  };
}

/** Which prayer is due right now, and which comes next. */
export function prayerStateAt(day, minutes) {
  const order = ['subh', 'dhuhr', 'asr', 'maghreb', 'isha'];
  for (const key of order) {
    const w = day.windows[key];
    if (minutes >= w.start && minutes < w.end) {
      const i = order.indexOf(key);
      return { current: key, next: order[(i + 1) % order.length] };
    }
  }
  if (minutes < day.windows.subh.start) {
    return { current: null, next: 'subh' };
  }
  return { current: 'isha', next: 'subh', lateIsha: true };
}

/** Day number of a date, exposed for callers that build slot indices. */
export function slotDay(dateISO) {
  return dayOfISO(dateISO);
}
