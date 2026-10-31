/**
 * Qada sync — a keyed blob store, nothing more.
 *
 * It stores whatever it is given, under a key derived from the sync code. It
 * has no idea what the payload is: encryption and decryption happen on the
 * phone, so the server never sees a ledger and cannot derive the key.
 *
 *   GET    /:id   → the stored envelope, or 404
 *   PUT    /:id   → store the envelope (max 256 KB)
 *   DELETE /:id   → forget it
 *
 * Deploy: see README.md in this folder.
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const MAX_BYTES = 256 * 1024;
const ID_PATTERN = /^[a-f0-9]{40}$/;

const reply = (body, status, extra = {}) =>
  new Response(body, { status, headers: { ...CORS, ...extra } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const id = new URL(request.url).pathname.replace(/^\/+/, '');
    if (!ID_PATTERN.test(id)) return reply('bad id', 400);

    const key = `blob:${id}`;

    if (request.method === 'GET') {
      const stored = await env.QADA.get(key);
      if (!stored) return reply('', 404);
      return reply(stored, 200, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      });
    }

    if (request.method === 'PUT') {
      const body = await request.text();
      if (body.length > MAX_BYTES) return reply('too large', 413);
      try {
        JSON.parse(body);
      } catch {
        return reply('bad json', 400);
      }
      await env.QADA.put(key, body);
      return reply('ok', 200);
    }

    if (request.method === 'DELETE') {
      await env.QADA.delete(key);
      return reply('ok', 200);
    }

    return reply('method not allowed', 405);
  },
};
