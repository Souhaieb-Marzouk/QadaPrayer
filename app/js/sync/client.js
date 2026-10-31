/**
 * The HTTP side of sync: three verbs over a tiny keyed store.
 *
 * The endpoint is a Cloudflare Worker (see `infra/`), but any server that
 * implements `GET/PUT/DELETE /:id` with a JSON body works — including a file
 * server you host yourself.
 */

export function makeClient({ endpoint, fetchImpl } = {}) {
  const base = String(endpoint || '').replace(/\/+$/, '');
  if (!base) throw new Error('no-endpoint');
  const call = fetchImpl || ((...args) => fetch(...args));

  const url = (id) => `${base}/${id}`;

  return {
    /**
     * Cheap reachability probe with no encryption involved, so a network problem
     * is told apart from a code problem. A 404 is the expected answer.
     */
    async ping() {
      const response = await call(`${base}/0000000000000000000000000000000000000000`, {
        method: 'GET',
        cache: 'no-store',
      });
      return response.status;
    },

    /** Returns the stored envelope, or null when nothing was pushed yet. */
    async get(id) {
      const response = await call(url(id), { method: 'GET', cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`http-${response.status}`);
      return response.json();
    },

    async put(id, envelope) {
      const response = await call(url(id), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) throw new Error(`http-${response.status}`);
      return true;
    },

    async remove(id) {
      const response = await call(url(id), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error(`http-${response.status}`);
      return true;
    },
  };
}
