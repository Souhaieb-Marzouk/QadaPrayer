/** Heading smoothing and the qibla geometry. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  angleDelta,
  guidance,
  headingFrom,
  isAligned,
  normalizeAngle,
  qiblaBearing,
  smoothHeading,
} from '../app/js/core/qibla.js';

function near(actual, expected, tolerance = 4) {
  const diff = Math.abs(((actual - expected + 540) % 360) - 180);
  return diff <= tolerance;
}

test('the bearing still points at the Kaaba', () => {
  assert.ok(near(qiblaBearing(36.8065, 10.1815), 113));
  assert.ok(near(qiblaBearing(48.8566, 2.3522), 119));
  assert.ok(near(qiblaBearing(51.5074, -0.1278), 119, 2));
  assert.ok(near(qiblaBearing(30.0444, 31.2357), 136));
  assert.equal(qiblaBearing(null, 10), null);
});

test('angles wrap cleanly', () => {
  assert.equal(normalizeAngle(-10), 350);
  assert.equal(normalizeAngle(370), 10);
  assert.equal(normalizeAngle(0), 0);
  assert.equal(normalizeAngle(null), null);
});

test('the shortest turn never goes the long way round', () => {
  assert.equal(angleDelta(350, 10), 20);
  assert.equal(angleDelta(10, 350), -20);
  assert.equal(Math.abs(angleDelta(0, 180)), 180);
  assert.equal(angleDelta(90, 90), 0);
});

test('smoothing approaches the new heading without jumping across north', () => {
  let heading = 355;
  for (let step = 0; step < 40; step += 1) heading = smoothHeading(heading, 5);

  // It must arrive near 5°, not near 180° via the long way round.
  assert.ok(near(heading, 5, 2), `ended at ${heading}`);
});

test('the first reading is taken as-is', () => {
  assert.equal(smoothHeading(undefined, 42), 42);
  assert.equal(smoothHeading(42, NaN), 42);
});

test('a noisy sensor settles down', () => {
  let heading = 100;
  const noise = [104, 96, 103, 97, 102, 98, 101];
  for (const reading of noise) heading = smoothHeading(heading, reading, 0.25);

  assert.ok(near(heading, 100, 3), `ended at ${heading}`);
});

test('iOS and Android events are read in that order', () => {
  assert.equal(headingFrom({ webkitCompassHeading: 90, alpha: 10 }), 90);
  assert.equal(headingFrom({ alpha: 90 }), 270);
  assert.equal(headingFrom({}), null);
  assert.equal(headingFrom(null), null);
});

test('guidance says how far and which way', () => {
  const aligned = guidance(113, 113);
  assert.equal(aligned.aligned, true);
  assert.equal(aligned.relative, 0);

  const right = guidance(113, 90);
  assert.equal(right.side, 'right');
  assert.ok(Math.abs(right.relative - 23) < 0.001);

  const left = guidance(113, 130);
  assert.equal(left.side, 'left');
  assert.ok(Math.abs(left.relative + 17) < 0.001);

  assert.equal(guidance(113, null).relative, null);
});

test('alignment tolerates a few degrees', () => {
  assert.equal(isAligned(118, 118), true);
  assert.equal(isAligned(120, 118), true);
  assert.equal(isAligned(140, 118), false);
  assert.equal(isAligned(1, 359), true);
  assert.equal(isAligned(180, 0), false);
});
