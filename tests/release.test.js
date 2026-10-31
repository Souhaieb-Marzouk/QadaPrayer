/**
 * Release consistency: the version must agree across the files that carry it,
 * and the offline shell must list files that actually exist. These are the
 * mistakes that only show up after a deploy.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');

async function read(file) {
  return readFile(path.join(ROOT, file), 'utf8');
}

test('package.json and the app report the same version', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const config = await read('app/js/config.js');
  const match = /VERSION\s*=\s*'([^']+)'/.exec(config);
  assert.ok(match, 'VERSION not found in app/js/config.js');
  assert.equal(match[1], pkg.version, 'version mismatch between package.json and config.js');
});

test('the service worker cache is versioned', async () => {
  const sw = await read('app/sw.js');
  const match = /const VERSION = '([^']+)'/.exec(sw);
  assert.ok(match, 'cache VERSION not found in sw.js');
  assert.match(match[1], /^qada-v\d+$/, 'cache name should look like qada-vN');
});

test('every file in the offline shell exists', async () => {
  const sw = await read('app/sw.js');
  const shellBlock = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(shellBlock, 'SHELL array not found');
  const entries = [...shellBlock[1].matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
  assert.ok(entries.length > 20, 'the shell should list the whole app');

  for (const entry of entries) {
    if (entry === '') continue;
    const target = path.join(ROOT, 'app', entry.endsWith('/') ? `${entry}index.html` : entry);
    await assert.doesNotReject(stat(target), `missing from the shell: ${entry}`);
  }
});

test('the manifest is valid and its icons exist', async () => {
  const manifest = JSON.parse(await read('app/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 3);
  for (const icon of manifest.icons) {
    await assert.doesNotReject(stat(path.join(ROOT, 'app', icon.src)));
    assert.match(icon.sizes, /^\d+x\d+$/);
  }
  assert.ok(manifest.start_url, 'start_url is required');
  assert.ok(manifest.scope, 'scope is required');
});

test('the app entry point loads the updater', async () => {
  const index = await read('app/index.html');
  assert.match(index, /src="\.\/js\/main\.js"/);
  // The service worker must be registered exactly once, from the module.
  assert.equal((index.match(/serviceWorker\.register/g) || []).length, 0);
});

test('the landing page points at the real repository', async () => {
  const html = await read('index.html');
  assert.equal(html.includes('github.com/REPLACE_ME'), false, 'placeholder repository link left in the site');
  assert.match(html, /github\.com\/Souhaieb-Marzouk\/QadaPrayer/);
});
