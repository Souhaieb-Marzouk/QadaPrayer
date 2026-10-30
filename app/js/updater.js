/**
 * Update detection for the installed app.
 *
 * A service worker keeps serving the cached shell until a new worker takes
 * over. This module registers the worker with `updateViaCache: 'none'`, checks
 * for a new version on launch, when the app becomes visible and every half hour,
 * and tells the UI when one is waiting so it can offer a reload.
 */

const CHECK_INTERVAL = 30 * 60 * 1000;

let registration = null;
let hadController = false;
let reloading = false;
let notifier = null;
let intervalId = null;

/**
 * @param {{ onAvailable?: () => void }} options
 */
export async function initUpdater({ onAvailable } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  notifier = onAvailable || null;
  hadController = Boolean(navigator.serviceWorker.controller);

  try {
    registration = await navigator.serviceWorker.register('./sw.js', {
      scope: './',
      updateViaCache: 'none',
    });
  } catch {
    return null;
  }

  watchInstalling(registration.installing);

  registration.addEventListener('updatefound', () => {
    watchInstalling(registration.installing);
  });

  // A new worker has taken over: the page is still running old code, so reload
  // once. Skipped on the very first activation, where there was no controller.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(checkForUpdate, CHECK_INTERVAL);

  // A worker that was already waiting when the page loaded (rare, but possible
  // after a hard refresh) still deserves the prompt.
  if (registration.waiting && hadController) announce();

  return registration;
}

function watchInstalling(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
  });
}

function announce() {
  if (notifier) notifier();
}

/** Ask the browser to look for a new service worker now. */
export async function checkForUpdate() {
  if (!registration) return { checked: false, found: false };
  const before = registration.installing || registration.waiting;
  try {
    await registration.update();
  } catch {
    return { checked: false, found: false };
  }
  const after = registration.installing || registration.waiting;
  return { checked: true, found: Boolean(after) && after !== before };
}

/** Activate the waiting worker; `controllerchange` reloads the page. */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    // If the message is lost, do not leave the user stuck on old code.
    setTimeout(() => {
      if (!reloading) window.location.reload();
    }, 1500);
    return;
  }
  window.location.reload();
}

export function isSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}
