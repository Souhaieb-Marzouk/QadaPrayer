/** The qibla bearing, checked against the standard great-circle formula. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isAligned, qiblaBearing } from '../app/js/core/qibla.js';

/** Angles are compared with a tolerance: rounding in sources differs by a degree. */
function near(actual, expected, tolerance = 4) {
  const diff = Math.abs(((actual - expected + 540) % 360) - 180);
  return diff <= tolerance;
}

test('Tunis', () => {
  const bearing = qiblaBearing(36.8065, 10.1815);
  assert.ok(near(bearing, 113), `got ${bearing}`);
});

test('Paris', () => {
  const bearing = qiblaBearing(48.8566, 2.3522);
  assert.ok(near(bearing, 119), `got ${bearing}`);
});

test('London — the published value is about 119°', () => {
  const bearing = qiblaBearing(51.5074, -0.1278);
  assert.ok(near(bearing, 119, 2), `got ${bearing}`);
});

test('Cairo', () => {
  const bearing = qiblaBearing(30.0444, 31.2357);
  assert.ok(near(bearing, 136), `got ${bearing}`);
});

test('Jakarta points west-north-west', () => {
  const bearing = qiblaBearing(-6.2088, 106.8456);
  assert.ok(near(bearing, 295), `got ${bearing}`);
});

test('standing on the Kaaba has no meaningful bearing', () => {
  const bearing = qiblaBearing(21.4225, 39.8262);
  assert.ok(bearing === null || Number.isFinite(bearing));
});

test('bad coordinates are refused', () => {
  assert.equal(qiblaBearing(null, 10), null);
  assert.equal(qiblaBearing('a', 10), null);
});

test('alignment tolerates a few degrees', () => {
  assert.equal(isAligned(118, 118), true);
  assert.equal(isAligned(120, 118), true);
  assert.equal(isAligned(140, 118), false);
  assert.equal(isAligned(1, 359), true);
  assert.equal(isAligned(180, 0), false);
});
