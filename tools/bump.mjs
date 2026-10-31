#!/usr/bin/env node
/**
 * Bump the version everywhere it is written down.
 *
 *   node tools/bump.mjs 0.2.1
 *
 * Updates:
 *   package.json          "version"
 *   app/js/config.js      VERSION
 *   app/sw.js             qada-vN  (incremented so installed copies see the update)
 *
 * It also prints the two values to put in QadaPrayer.csproj, which lives in the
 * MAUI project and not in this repository.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const requested = process.argv[2];
if (!requested || !/^\d+\.\d+\.\d+$/.test(requested)) {
  console.error('Usage: node tools/bump.mjs <major.minor.patch>');
  process.exit(1);
}

const ROOT = path.resolve('.');
const [major, minor, patch] = requested.split('.').map(Number);

// Never go backwards. A release built for an older version (say an APK rebuild
// of 0.5.0) used to silently downgrade the whole web app.
const current = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')).version;
const asNumber = (value) => value.split('.').reduce((total, part) => total * 1000 + Number(part), 0);

if (asNumber(requested) < asNumber(current) && !process.argv.includes('--force')) {
  console.error(`Refusing to go backwards: package.json is ${current}, asked for ${requested}.`);
  console.error('Pass --force only if you really mean it.');
  process.exit(1);
}

async function patchFile(file, replacer) {
  const full = path.join(ROOT, file);
  const before = await readFile(full, 'utf8');
  const after = replacer(before);
  if (after === before) {
    console.warn(`  ~ ${file} (no change)`);
    return;
  }
  await writeFile(full, after, 'utf8');
  console.log(`  + ${file}`);
}

await patchFile('package.json', (text) =>
  text.replace(/"version":\s*"[^"]+"/, `"version": "${requested}"`),
);

await patchFile('app/js/config.js', (text) =>
  text.replace(/export const VERSION = '[^']+';/, `export const VERSION = '${requested}';`),
);

await patchFile('app/sw.js', (text) =>
  text.replace(/const VERSION = 'qada-v(\d+)';/, (_match, digits) => {
    return `const VERSION = 'qada-v${Number(digits) + 1}';`;
  }),
);

const swNow = await readFile(path.join(ROOT, 'app/sw.js'), 'utf8');
const cache = /const VERSION = '(qada-v\d+)'/.exec(swNow)?.[1] ?? '?';
const versionCode = major * 10000 + minor * 100 + patch;

console.log('');
console.log(`Version ${requested} · cache ${cache}`);
console.log('Now set these in QadaPrayer.csproj:');
console.log(`  <ApplicationDisplayVersion>${requested}</ApplicationDisplayVersion>`);
console.log(`  <ApplicationVersion>${versionCode}</ApplicationVersion>`);
console.log('');
console.log('Then:  .\\tools\\release.ps1 -ProjectDir C:\\path\\to\\QadaPrayer');
