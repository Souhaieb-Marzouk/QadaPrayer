/**
 * Export the ledger out of the app.
 *
 * Two shapes:
 *  - `ledgerCsv`    one row per prayer, the raw record (40 000 rows for a long
 *                   backlog, which every spreadsheet copes with);
 *  - `summaryByYear` totals per year, used by the printable page.
 */

import { PRAYERS, fromDayNumber, toISO } from './core/dates.js';

const SLOTS = PRAYERS.length;

function statusOf(mark) {
  if (mark === 1) return 'prayed';
  if (mark === 2) return 'exempt';
  return 'missed';
}

/**
 * @param {import('./core/engine.js').Qada} model
 * @param {{today?: string}} [options]
 */
export function ledgerCsv(model, { today = model.today } = {}) {
  const start = model.startIndex;
  if (start === null) return 'date,prayer,status\n';

  const end = model.backlogEnd(today);
  const lines = ['date,prayer,status'];

  for (let index = start; index <= end; index += 1) {
    const date = toISO(fromDayNumber(Math.floor(index / SLOTS)));
    lines.push(`${date},${PRAYERS[index % SLOTS]},${statusOf(model.get(index))}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Totals per Gregorian year: what was owed, what is done, what is left.
 * Years with no owed prayers (before puberty) are omitted.
 */
export function summaryByYear(model, { today = model.today } = {}) {
  const start = model.startIndex;
  if (start === null) return [];

  const end = model.backlogEnd(today);
  const years = new Map();

  for (let index = start; index <= end; index += 1) {
    const date = fromDayNumber(Math.floor(index / SLOTS));
    let entry = years.get(date.y);
    if (!entry) {
      entry = { year: date.y, owed: 0, done: 0, exempt: 0 };
      years.set(date.y, entry);
    }
    const mark = model.get(index);
    if (mark === 2) {
      entry.exempt += 1;
      continue;
    }
    entry.owed += 1;
    if (mark === 1) entry.done += 1;
  }

  return [...years.values()]
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({ ...entry, remaining: entry.owed - entry.done }));
}

/** A short, filesystem-safe base name for the exported files. */
export function exportName(model, kind, iso) {
  const place = (model.profile.location?.name || 'qada')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `qada-${place}-${iso}-${kind}`;
}
