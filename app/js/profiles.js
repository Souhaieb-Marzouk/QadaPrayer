/**
 * Several ledgers on one phone.
 *
 * A document holds every profile and which one is active:
 *
 *   { v: 2, activeId: 'p1', profiles: [{ id, name, createdAt, data }] }
 *
 * `data` is exactly the old single-user state, so every existing helper
 * (engine, backup, merge) keeps working unchanged.
 *
 * Everything here is pure: it never touches storage.
 */

export const DOC_VERSION = 2;
export const MAX_PROFILES = 8;

let counter = 0;

function newId() {
  counter += 1;
  return `p${Date.now().toString(36)}${counter.toString(36)}`;
}

export function defaultName(language = 'en') {
  if (language === 'fr') return 'Moi';
  if (language === 'ar') return 'أنا';
  return 'Me';
}

/** Wrap a legacy single-user state into a document. */
export function wrapState(state, name) {
  const now = new Date().toISOString();
  const id = newId();
  return {
    v: DOC_VERSION,
    activeId: id,
    profiles: [
      { id, name: String(name || defaultName()).slice(0, 40), createdAt: now, data: state, sync: {} },
    ],
  };
}

/**
 * Accept a v1 state, a v2 document, or nothing, and return a document.
 * `fallbackName` is used when a legacy state is upgraded.
 */
export function normalizeDoc(raw, fallbackName = 'Me') {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.v === DOC_VERSION && Array.isArray(raw.profiles) && raw.profiles.length > 0) {
    const profiles = raw.profiles
      .filter((entry) => entry && entry.data && typeof entry.id === 'string')
      .map((entry) => ({
        id: entry.id,
        name: String(entry.name || fallbackName).slice(0, 40),
        createdAt: entry.createdAt || new Date().toISOString(),
        data: entry.data,
        sync: entry.sync && typeof entry.sync === 'object' ? entry.sync : {},
      }));
    if (!profiles.length) return null;
    const activeId = profiles.some((entry) => entry.id === raw.activeId)
      ? raw.activeId
      : profiles[0].id;
    return { v: DOC_VERSION, activeId, profiles };
  }

  // Legacy: a bare state object with a profile and marks.
  if (raw.profile || raw.marks) {
    return wrapState(raw, fallbackName);
  }

  return null;
}

export function activeProfile(doc) {
  if (!doc) return null;
  return doc.profiles.find((entry) => entry.id === doc.activeId) || doc.profiles[0] || null;
}

export function activeData(doc) {
  const profile = activeProfile(doc);
  return profile ? profile.data : null;
}

export function setActiveData(doc, data) {
  const profile = activeProfile(doc);
  if (!profile) return doc;
  profile.data = data;
  return doc;
}

export function switchTo(doc, id) {
  if (!doc.profiles.some((entry) => entry.id === id)) return doc;
  doc.activeId = id;
  return doc;
}

/** Sync settings belong to one profile: each person keeps their own code. */
export function profileSync(doc) {
  const profile = activeProfile(doc);
  return (profile && profile.sync) || {};
}

export function setProfileSync(doc, patch) {
  const profile = activeProfile(doc);
  if (!profile) return doc;
  profile.sync = { ...(profile.sync || {}), ...patch };
  return doc;
}

export function addProfile(doc, name, data) {
  if (doc.profiles.length >= MAX_PROFILES) {
    throw new Error('too-many-profiles');
  }
  const id = newId();
  doc.profiles.push({
    id,
    name: String(name || defaultName()).slice(0, 40),
    createdAt: new Date().toISOString(),
    data,
    sync: {},
  });
  doc.activeId = id;
  return doc;
}

/** Removing the last profile is refused; the caller keeps at least one ledger. */
export function removeProfile(doc, id) {
  if (doc.profiles.length <= 1) return doc;
  const index = doc.profiles.findIndex((entry) => entry.id === id);
  if (index === -1) return doc;
  doc.profiles.splice(index, 1);
  if (doc.activeId === id) doc.activeId = doc.profiles[0].id;
  return doc;
}

export function renameProfile(doc, id, name) {
  const profile = doc.profiles.find((entry) => entry.id === id);
  if (!profile) return doc;
  profile.name = String(name || profile.name).slice(0, 40);
  return doc;
}

/** A blank document for a brand-new install: there is none until onboarding. */
export function isEmpty(doc) {
  return !doc || !Array.isArray(doc.profiles) || doc.profiles.length === 0;
}
