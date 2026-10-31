/** Bearing from a place to the Kaaba — no sensors, just maths. */

const KAABA = { lat: 21.4225, lon: 39.8262 };

const toRad = (degrees) => (degrees * Math.PI) / 180;
const toDeg = (radians) => (radians * 180) / Math.PI;

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

/** True when the phone is pointing within `slack` degrees of the Kaaba. */
export function isAligned(heading, bearing, slack = 6) {
  if (!Number.isFinite(heading) || !Number.isFinite(bearing)) return false;
  const distance = Math.abs(((heading - bearing + 540) % 360) - 180);
  return distance <= slack;
}
