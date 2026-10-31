/** Bearing from a place to the Kaaba — no sensors, just maths. */

const KAABA = { lat: 21.4225, lon: 39.8262 };

const toRad = (degrees) => (degrees * Math.PI) / 180;
const toDeg = (radians) => (radians * 180) / Math.PI;

/** Wrap any angle into 0–360. */
export function normalizeAngle(degrees) {
  if (!Number.isFinite(degrees)) return null;
  return ((degrees % 360) + 360) % 360;
}

/**
 * @returns {number} degrees clockwise from true north, 0–360
 */
export function qiblaBearing(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const deltaLon = toRad(KAABA.lon - lon);
  const y = Math.sin(deltaLon);
  const x =
    Math.cos(toRad(lat)) * Math.tan(toRad(KAABA.lat)) - Math.sin(toRad(lat)) * Math.cos(deltaLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Signed shortest turn from `from` to `to`, in −180…180. */
export function angleDelta(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return ((to - from + 540) % 360) - 180;
}

/**
 * Low-pass filter for a heading that wraps at 360.
 * `factor` 0 keeps the old value, 1 jumps straight to the new one.
 */
export function smoothHeading(previous, next, factor = 0.2) {
  if (!Number.isFinite(next)) return previous;
  if (!Number.isFinite(previous)) return next;
  const step = angleDelta(previous, next) * Math.max(0.02, Math.min(1, factor));
  return (previous + step + 360) % 360;
}

/**
 * Heading from a deviceorientation event, best sensor first.
 * `webkitCompassHeading` (iOS) is relative to true north, `absolute` alpha is
 * relative to magnetic north, plain alpha is relative to wherever the phone
 * started — the last one is only a fallback.
 */
export function headingFrom(event) {
  if (!event) return null;

  if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    return normalizeAngle(event.webkitCompassHeading);
  }

  if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    return normalizeAngle(360 - event.alpha);
  }

  return null;
}

/** How far to turn, and how close we are. */
export function guidance(bearing, heading, slack = 5) {
  if (!Number.isFinite(bearing) || !Number.isFinite(heading)) {
    return { relative: null, aligned: false, side: 'none' };
  }
  const relative = angleDelta(heading, bearing);
  return {
    relative,
    aligned: Math.abs(relative) <= slack,
    side: relative > 0 ? 'right' : 'left',
  };
}

/** True when the phone is pointing within `slack` degrees of the Kaaba. */
export function isAligned(heading, bearing, slack = 6) {
  if (!Number.isFinite(heading) || !Number.isFinite(bearing)) return false;
  return Math.abs(angleDelta(bearing, heading)) <= slack;
}
