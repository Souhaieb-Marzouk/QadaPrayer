/**
 * One sync: pull, merge, push.
 *
 * There is no conflict UI because the ledger merge is commutative — a prayer
 * marked as made up on either device *is* made up, so the union is always the
 * right answer. See `merge.js`.
 */

import { Qada } from '../core/engine.js';
import { mergeModels } from '../merge.js';
import { hashCode, normalizeCode } from './code.js';
import { makeClient } from './client.js';
import { seal, unseal } from './crypto.js';

/**
 * @param {object} options
 * @param {string} options.endpoint  base URL of the sync server
 * @param {string} options.code      the sync code (any format `normalizeCode` accepts)
 * @param {import('../core/engine.js').Qada} options.model  this device's ledger
 * @param {Function} [options.fetchImpl]  injected for tests
 * @returns {Promise<{status: string, changed: boolean, model: object}>}
 */
export async function syncOnce({ endpoint, code, model, fetchImpl }) {
  const normalised = normalizeCode(code);
  if (!normalised) throw new Error('bad-code');

  const client = makeClient({ endpoint, fetchImpl });

  // Encryption needs a secure context; say so plainly instead of failing later
  // with a misleading network error.
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('no-crypto');

  let id;
  try {
    id = await hashCode(normalised);
  } catch {
    throw new Error('no-crypto');
  }

  const remote = await client.get(id);

  if (!remote) {
    await client.put(id, await seal(normalised, model.toJSON()));
    return { status: 'pushed', changed: false, model };
  }

  const incoming = Qada.fromJSON(await unseal(normalised, remote), model.today);
  const merged = mergeModels(model, incoming, model.today);
  const changed = merged.stats().done !== model.stats().done;

  if (changed) {
    await client.put(id, await seal(normalised, merged.toJSON()));
  }

  return { status: changed ? 'merged' : 'current', changed, model: changed ? merged : model };
}

/** Remove the server copy (the local ledger is untouched). */
export async function forgetRemote({ endpoint, code, fetchImpl }) {
  const normalised = normalizeCode(code);
  if (!normalised) throw new Error('bad-code');
  const client = makeClient({ endpoint, fetchImpl });
  return client.remove(await hashCode(normalised));
}
