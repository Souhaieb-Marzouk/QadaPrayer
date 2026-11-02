/**
 * Updates: the web app can check for a new release, but only the Android shell
 * can install one.
 *
 * The shell tells the page its own version (`?apk=0.13.0`), the page asks GitHub
 * what the latest release is, and when the user agrees it opens
 * `qadaprayer://install?url=…` which the shell intercepts.
 *
 * In a plain browser there is no shell: the same check runs and the answer is
 * just a link to the releases page.
 */

import { VERSION, LINKS } from './config.js';

export const RELEASES_API = 'https://api.github.com/repos/Souhaieb-Marzouk/QadaPrayer/releases/latest';
export const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

const INSTALL_SCHEME = 'qadaprayer';

/** "v0.13.0" / "0.13.0" / "0.13.0-beta" → comparable numbers. */
export function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value || '').trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** > 0 when `a` is newer than `b`, 0 when equal, < 0 when older. */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
}

/** The Android shell adds `?apk=<version>` to the URL it loads. */
export function installedVersion(params) {
  try {
    return String(params?.get?.('apk') || '').trim();
  } catch {
    return '';
  }
}

export function hasShell(version) {
  return Boolean(version);
}

/**
 * Ask GitHub for the latest release.
 * @returns {Promise<{version: string, apkUrl: string, pageUrl: string}|null>}
 */
export async function fetchLatestRelease(fetchImpl = (...args) => fetch(...args)) {
  const response = await fetchImpl(RELEASES_API, {
    headers: { accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`github-${response.status}`);

  const release = await response.json();
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const apk = assets.find((asset) => String(asset?.name || '').toLowerCase().endsWith('.apk'));

  return {
    version: String(release?.tag_name || '').replace(/^v/, ''),
    apkUrl: apk?.browser_download_url || '',
    pageUrl: release?.html_url || `${LINKS.repository}/releases/latest`,
  };
}

/** Should we check now? Once a day at most, or when forced. */
export function needsCheck(meta, now = Date.now()) {
  const last = meta?.apkCheckedAt ? Date.parse(meta.apkCheckedAt) : 0;
  return !last || now - last > CHECK_INTERVAL;
}

/**
 * Run the check and remember the result.
 * @returns {Promise<{available: boolean, version: string, apkUrl: string, pageUrl: string}>}
 */
export async function checkForApkUpdate(app, { force = false, fetchImpl } = {}) {
  const current = app.apkVersion || '';
  const meta = app.store?.meta || {};

  if (!force && !needsCheck(meta)) {
    const cached = meta.apkLatest || {};
    return {
      available: Boolean(cached.version) && compareVersions(cached.version, current) > 0,
      version: cached.version || '',
      apkUrl: cached.apkUrl || '',
      pageUrl: cached.pageUrl || `${LINKS.repository}/releases/latest`,
    };
  }

  try {
    const latest = await fetchLatestRelease(fetchImpl);
    app.store?.writeMeta({
      apkCheckedAt: new Date().toISOString(),
      apkLatest: latest,
    });

    return {
      ...latest,
      available:
        Boolean(latest.apkUrl) && current ? compareVersions(latest.version, current) > 0 : false,
    };
  } catch (error) {
    app.store?.writeMeta({ apkCheckedAt: new Date().toISOString() });
    throw error;
  }
}

/** Ask the shell to download and install; in a browser, open the release page. */
export function installUpdate(url) {
  if (!url) return false;
  try {
    window.location.href = `${INSTALL_SCHEME}://install?url=${encodeURIComponent(url)}`;
    return true;
  } catch {
    return false;
  }
}

export { VERSION };
