/**
 * Solar astronomy — a compact implementation of the NOAA/Meeus low-precision
 * solar position algorithm. Accuracy is about ±1 minute for mid-latitudes,
 * which is well inside what a prayer timetable needs, and it needs no network.
 *
 * All angles are in degrees unless stated otherwise.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const sin = (d) => Math.sin(d * RAD);
const cos = (d) => Math.cos(d * RAD);
const tan = (d) => Math.tan(d * RAD);
const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * DEG;
const acos = (x) => Math.acos(Math.max(-1, Math.min(1, x))) * DEG;

/** Julian day from a Unix timestamp in milliseconds. */
export function julianDay(timestamp) {
  return timestamp / 86400000 + 2440587.5;
}

/**
 * Declination of the sun and the equation of time for a Julian day.
 * @returns {{ declination: number, equationOfTime: number }} degrees, minutes
 */
export function solarPosition(jd) {
  const t = (jd - 2451545.0) / 36525;

  const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const meanAnomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const eccentricity = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;

  const center =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(meanAnomaly) +
    (0.019993 - 0.000101 * t) * sin(2 * meanAnomaly) +
    0.000289 * sin(3 * meanAnomaly);

  const trueLongitude = meanLongitude + center;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * sin(omega);

  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cos(omega);

  const declination = asin(sin(obliquity) * sin(apparentLongitude));

  const y = tan(obliquity / 2) ** 2;
  const equationOfTime =
    4 *
    DEG *
    (y * sin(2 * meanLongitude) -
      2 * eccentricity * sin(meanAnomaly) +
      4 * eccentricity * y * sin(meanAnomaly) * cos(2 * meanLongitude) -
      0.5 * y * y * sin(4 * meanLongitude) -
      1.25 * eccentricity * eccentricity * sin(2 * meanAnomaly));

  return { declination, equationOfTime };
}

/** Sun altitude (degrees) at a given instant and place. */
export function solarAltitude(timestamp, latitude, longitude) {
  const jd = julianDay(timestamp);
  const { declination, equationOfTime } = solarPosition(jd);
  const utcMinutes = ((timestamp % 86400000) + 86400000) % 86400000 / 60000;
  const trueSolarTime =
    utcMinutes + equationOfTime + 4 * longitude;
  const hourAngle = trueSolarTime / 4 - 180;
  const altitude = asin(
    sin(latitude) * sin(declination) +
      cos(latitude) * cos(declination) * cos(hourAngle),
  );
  return { altitude, declination, hourAngle };
}

/**
 * Hour angle (degrees, positive) at which the sun reaches a given altitude.
 * Returns `null` when the sun never reaches that altitude on that day.
 */
export function hourAngleForAltitude(latitude, declination, altitude) {
  const numerator = sin(altitude) - sin(latitude) * sin(declination);
  const denominator = cos(latitude) * cos(declination);
  if (Math.abs(denominator) < 1e-9) return null;
  const cosH = numerator / denominator;
  if (cosH > 1 || cosH < -1) return null;
  return acos(cosH);
}

/**
 * Altitude of the sun when the shadow of an object equals `shadowFactor`
 * times its own length plus the shadow cast at noon.
 *
 *   cot(h) = shadowFactor + tan(|latitude - declination|)
 *
 * `shadowFactor` is 1 for the Maliki/Shafi'i/Jumbur view and 2 for the Hanafi.
 */
export function asrAltitude(latitude, declination, shadowFactor) {
  const delta = Math.min(89.5, Math.abs(latitude - declination));
  return Math.atan(1 / (shadowFactor + tan(delta))) * DEG;
}
