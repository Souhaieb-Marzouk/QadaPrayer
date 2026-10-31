#!/usr/bin/env node
/**
 * Zero-dependency static server for local development.
 *
 *   node tools/serve.mjs [port] [root] [host]
 *
 * Defaults: port 5173, repository root, host 127.0.0.1.
 * Set host to 0.0.0.0 to test from a phone on the same Wi-Fi network
 * (the app itself still works, but the service worker needs https or localhost).
 */

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.argv[2] || process.env.PORT || 5173);
const root = path.resolve(process.argv[3] || '.');
const host = process.argv[4] || process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.resolve(root, `.${decoded}`);
  if (!target.startsWith(root)) return null;
  return target;
}

const server = http.createServer(async (req, res) => {
  try {
    let target = resolveSafe(req.url || '/');
    if (!target) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let info = await stat(target).catch(() => null);
    if (info?.isDirectory()) {
      target = path.join(target, 'index.html');
      info = await stat(target).catch(() => null);
    }
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`Not found: ${req.url}`);
      return;
    }

    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'service-worker-allowed': '/',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(target).pipe(res);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});

server.listen(port, host, () => {
  const shown = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`QadaPrayer dev server → http://${shown}:${port}/`);
  console.log(`App            → http://${shown}:${port}/app/`);
  console.log(`Demo           → http://${shown}:${port}/app/?demo=1`);
  if (host === '0.0.0.0') {
    console.log('Listening on all interfaces — open the same URLs with this PC’s LAN IP.');
  }
});
