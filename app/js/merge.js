/**
 * Merging two ledgers — the safe half of syncing.
 *
 * Restoring a backup used to *replace* everything, which loses anything marked
 * on the second phone. A merge takes the union instead: for every slot, the
 * most "complete" status wins.
 *
 *   done   beats exempt   beats missed
 *
 * That is sound for a make-up ledger: a prayer recorded as made up on either
 * device *is* made up, and an exempt day stays exempt unless one device says it
 * was actually prayed.
 */

import { MARK_DONE, MARK_EXEMPT, Qada } from './core/engine.js';

/**
 * @param {Qada} local      what this device has
 * @param {Qada} incoming   what the backup or the other device has
 * @param {string} [today]
 * @returns {Qada} a new model; neither input is modified
 */
export function mergeModels(local, incoming, today = local.today) {
  const result = Qada.fromJSON(local.toJSON(), today);

  const size = Math.max(local.ledger.length, incoming.ledger.length);
  const merged = new Uint8Array(size);

  for (let index = 0; index < size; index += 1) {
    const a = local.get(index);
    const b = incoming.get(index);
    if (a === MARK_DONE || b === MARK_DONE) merged[index] = MARK_DONE;
    else if (a === MARK_EXEMPT || b === MARK_EXEMPT) merged[index] = MARK_EXEMPT;
    else merged[index] = 0;
  }

  result.ledger = merged;

  // Deferrals are about *today on this device*; they never travel.
  result.data.pauses = {};

  // Keep both histories so an audit trail survives, oldest first.
  const log = [...(local.data.log || []), ...(incoming.data.log || [])].slice(-200);
  result.data.log = log;

  result.touch();
  return result;
}
