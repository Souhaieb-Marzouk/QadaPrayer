/* Qada service worker — offline shell, no network dependency at runtime. */

const VERSION = 'qada-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/config.js',
  './js/i18n.js',
  './js/store.js',
  './js/notify.js',
  './js/core/dates.js',
  './js/core/astro.js',
  './js/core/prayerTimes.js',
  './js/core/engine.js',
  './js/core/reminders.js',
  './js/core/rle.js',
  './js/ui/icons.js',
  './js/ui/dom.js',
  './js/ui/today.js',
  './js/ui/calendar.js',
  './js/ui/stats.js',
  './js/ui/settings.js',
  './js/ui/onboarding.js',
  './js/ui/sheets.js',
  './js/ui/lock.js',
  './data/cities.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/icon-180.png',
  './assets/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match('./index.html');
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});

/* Focus an open Qada window when a reminder is tapped, or open the app. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if (client.url.includes('/app/') && 'focus' in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow('./#/today');
      }
    })(),
  );
});
