#!/usr/bin/env node
/**
 * Build the release artifacts.
 *
 *   node tools/package.mjs
 *
 * Produces, in ./dist:
 *   qada-<version>-web.zip        deployable copy of the site + app (attach to the release)
 *   qada-<version>-web.zip.sha256 checksum for the download
 *
 * The archive is deterministic: the same sources always produce the same bytes,
 * so a checksum means something.
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createZip } from './zip.mjs';

const ROOT = path.resolve('.');
const DIST = path.join(ROOT, 'dist');

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

/** Files and folders that make up a deployable copy of Qada. */
const INCLUDE = ['index.html', 'site.css', 'LICENSE', 'app'];

async function walk(target, nameInArchive) {
  const info = await stat(target);
  if (info.isFile()) {
    return [{ name: nameInArchive, data: await readFile(target) }];
  }
  const entries = await readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    files.push(
      ...(await walk(path.join(target, entry.name), `${nameInArchive}/${entry.name}`)),
    );
  }
  return files;
}

const archiveRoot = `qada-${version}`;
const entries = [];
for (const item of INCLUDE) {
  entries.push(...(await walk(path.join(ROOT, item), `${archiveRoot}/${item}`)));
}

entries.sort((a, b) => a.name.localeCompare(b.name));

const zip = createZip(entries);
const checksum = createHash('sha256').update(zip).digest('hex');

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const zipName = `qada-${version}-web.zip`;
await writeFile(path.join(DIST, zipName), zip);
await writeFile(path.join(DIST, `${zipName}.sha256`), `${checksum}  ${zipName}\n`);

const totalKb = entries.reduce((sum, entry) => sum + entry.data.length, 0) / 1024;
console.log(`Qada ${version}`);
console.log(`  ${entries.length} files, ${totalKb.toFixed(0)} kB uncompressed`);
console.log(`  dist/${zipName}  ${(zip.length / 1024).toFixed(0)} kB`);
console.log(`  sha256 ${checksum}`);
console.log('');
console.log('Attach both files to the GitHub release. The zip contains the landing');
console.log('page and the app; unzip it at the root of any static host.');
