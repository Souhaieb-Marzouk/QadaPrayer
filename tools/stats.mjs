/**
 * Refresh stats.json from the GitHub API: how many times the APK was downloaded.
 *
 *   node tools/stats.mjs
 *
 * Counts only the .apk assets of published releases. No user is identified —
 * GitHub counts downloads, not people.
 */

import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const API = 'https://api.github.com/repos/Souhaieb-Marzouk/QadaPrayer/releases?per_page=100';

let releases = [];
try {
  const response = await fetch(API, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'QadaPrayer-stats' },
  });
  if (!response.ok) throw new Error(`github-${response.status}`);
  releases = await response.json();
} catch (error) {
  console.error('could not reach GitHub:', error.message);
  if (existsSync('stats.json')) {
    console.log('keeping the previous stats.json');
    process.exit(0);
  }
}

const downloads = (Array.isArray(releases) ? releases : []).reduce((total, release) => {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return total + assets
    .filter((asset) => String(asset?.name || '').toLowerCase().endsWith('.apk'))
    .reduce((sum, asset) => sum + (Number(asset.download_count) || 0), 0);
}, 0);

const payload = { downloads, updatedAt: new Date().toISOString() };
writeFileSync('stats.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`stats.json → ${downloads} APK downloads`);
