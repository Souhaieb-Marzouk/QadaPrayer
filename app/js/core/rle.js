/**
 * Run-length encoding for the mark ledger.
 *
 * A lifetime of prayers is ~36 000 slots for a 20-year backlog, and almost all
 * of it is uniform (everything missed, or everything done since the user got
 * serious). Encoding the whole timeline as (value, length) pairs keeps a full
 * backup in the low kilobytes and makes bulk edits cheap.
 */

export function encodeRuns(values, size = values.length) {
  if (size === 0) return [];
  const runs = [];
  let current = values[0];
  let length = 1;
  for (let i = 1; i < size; i += 1) {
    if (values[i] === current) {
      length += 1;
    } else {
      runs.push([current, length]);
      current = values[i];
      length = 1;
    }
  }
  runs.push([current, length]);
  return runs;
}

export function decodeRuns(runs, size) {
  const out = new Uint8Array(size);
  let offset = 0;
  for (const run of runs) {
    if (!Array.isArray(run) || run.length !== 2) {
      throw new TypeError('Corrupt run-length data');
    }
    const value = Number(run[0]);
    const length = Number(run[1]);
    if (!Number.isInteger(value) || !Number.isInteger(length) || length < 0) {
      throw new TypeError('Corrupt run-length data');
    }
    const end = Math.min(size, offset + length);
    if (value !== 0) out.fill(value, offset, end);
    offset = end;
    if (offset >= size) break;
  }
  return out;
}

export function runCount(runs) {
  return runs.length;
}
