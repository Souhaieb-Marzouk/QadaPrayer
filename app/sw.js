/* Qada service worker — offline shell, no network dependency at runtime. */

const VERSION = 'qada-v48';
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
  './js/updater.js',
  './js/exporter.js',
  './js/native.js',
  './js/apk.js',
  './js/merge.js',
  './js/profiles.js',
  './js/sync/code.js',
  './js/sync/crypto.js',
  './js/sync/client.js',
  './js/sync/sync.js',
  './js/core/dates.js',
  './js/core/astro.js',
  './js/core/prayerTimes.js',
  './js/core/engine.js',
  './js/core/reminders.js',
  './js/core/rle.js',
  './js/core/qibla.js',
  './js/ui/icons.js',
  './js/ui/dom.js',
  './js/ui/today.js',
  './js/ui/calendar.js',
  './js/ui/stats.js',
  './js/ui/settings.js',
  './js/ui/review.js',
  './js/ui/onboarding.js',
  './js/ui/sheets.js',
  './js/ui/lock.js',
  './js/ui/print.js',
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
      // Deliberately do NOT skipWaiting: the page decides when to swap, so a
      // user halfway through marking prayers is never reloaded under their feet.
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

/* The page asks for the swap once the user accepts the update banner. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

/* A reminder was tapped — or one of its action buttons. */
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const client = clientList.find((entry) => entry.url.includes('/app/'));

      // "Later": ask the page to show it again in ten minutes.
      if (event.action === 'later' && data.dateISO && data.prayer) {
        if (client) {
          client.postMessage({
            type: 'SNOOZE',
            dateISO: data.dateISO,
            prayer: data.prayer,
            title: event.notification.title,
            body: event.notification.body,
          });
          await client.focus();
          return;
        }
        await self.clients.openWindow(`./?mark=${data.dateISO}:${data.prayer}`);
        return;
      }

      // "I prayed": mark it without making the user do anything.
      if (event.action === 'prayed' && data.dateISO && data.prayer) {
        if (client) {
          client.postMessage({
            type: 'MARK_PRAYED',
            dateISO: data.dateISO,
            prayer: data.prayer,
          });
          await client.focus();
          return;
        }
        await self.clients.openWindow(`./?mark=${data.dateISO}:${data.prayer}`);
        return;
      }

      if (client) {
        await client.focus();
        // A plain tap on a prayer reminder goes straight to the confirmation.
        if (event.action !== 'later' && data.dateISO && data.prayer) {
          client.postMessage({
            type: 'OPEN_PRAYER',
            dateISO: data.dateISO,
            prayer: data.prayer,
          });
        }
        return;
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(
          data.dateISO && data.prayer && event.action !== 'later'
            ? `./?mark=${data.dateISO}:${data.prayer}`
            : './#/today',
        );
      }
    })(),
  );
});
