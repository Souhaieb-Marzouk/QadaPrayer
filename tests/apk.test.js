/** Version comparison and the daily check policy for APK updates. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECK_INTERVAL,
  compareVersions,
  fetchLatestRelease,
  installedVersion,
  needsCheck,
  parseVersion,
} from '../app/js/apk.js';

test('versions are parsed with or without a v', () => {
  assert.deepEqual(parseVersion('v0.13.0'), { major: 0, minor: 13, patch: 0 });
  assert.deepEqual(parseVersion('0.9.2'), { major: 0, minor: 9, patch: 2 });
  assert.deepEqual(parseVersion('1.2.3-beta'), { major: 1, minor: 2, patch: 3 });
  assert.equal(parseVersion('nope'), null);
  assert.equal(parseVersion(''), null);
});

test('comparison follows semver order, numerically', () => {
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0, '0.10 is newer than 0.9');
  assert.ok(compareVersions('0.9.0', '0.10.0') < 0);
  assert.equal(compareVersions('0.13.0', 'v0.13.0'), 0);
  assert.ok(compareVersions('1.0.0', '0.99.99') > 0);
  assert.equal(compareVersions('nonsense', '0.1.0'), 0, 'unparseable means "not newer"');
});

test('the installed version comes from the shell query parameter', () => {
  const params = new URLSearchParams('?apk=0.13.0&demo=1');
  assert.equal(installedVersion(params), '0.13.0');
  assert.equal(installedVersion(new URLSearchParams('')), '');
});

test('a check runs at most once a day', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  assert.equal(needsCheck({}, now), true);
  assert.equal(needsCheck({ apkCheckedAt: '2026-10-31T09:00:00Z' }, now), false);
  assert.equal(needsCheck({ apkCheckedAt: '2026-10-30T09:00:00Z' }, now), true);
  assert.ok(CHECK_INTERVAL === 24 * 60 * 60 * 1000);
});

test('the latest release is read from the GitHub payload', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      tag_name: 'v0.14.0',
      html_url: 'https://github.com/x/y/releases/tag/v0.14.0',
      assets: [
        { name: 'qada-0.14.0-web.zip', browser_download_url: 'https://github.com/x/web.zip' },
        { name: 'QadaPrayer-0.14.0.apk', browser_download_url: 'https://github.com/x/app.apk' },
      ],
    }),
  });

  const release = await fetchLatestRelease(fetchImpl);
  assert.equal(release.version, '0.14.0');
  assert.equal(release.apkUrl, 'https://github.com/x/app.apk');
  assert.match(release.pageUrl, /v0\.14\.0/);
});

test('a release without an APK still answers', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ tag_name: 'v0.15.0', assets: [] }),
  });

  const release = await fetchLatestRelease(fetchImpl);
  assert.equal(release.version, '0.15.0');
  assert.equal(release.apkUrl, '');
});

test('an HTTP failure is reported, not swallowed', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(() => fetchLatestRelease(fetchImpl), /github-503/);
});
