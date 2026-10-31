/** Printable make-up plan — a clean page to keep or to show a scholar. */

import { t, number, dateLong, dateMedium } from '../i18n.js';
import { esc } from './dom.js';
import { summaryByYear } from '../exporter.js';

function stat(label, value) {
  return `
    <div class="print-stat">
      <span class="print-stat__label">${esc(label)}</span>
      <span class="print-stat__value">${esc(value)}</span>
    </div>`;
}

export function render(app) {
  const model = app.model;
  const projection = model.projection();
  const years = summaryByYear(model);

  const rows = years
    .map(
      (entry) => `
      <tr>
        <td>${esc(String(entry.year))}</td>
        <td class="num">${esc(number(entry.done))}</td>
        <td class="num">${esc(number(entry.remaining))}</td>
      </tr>`,
    )
    .join('');

  const totals = years.reduce(
    (sum, entry) => ({ done: sum.done + entry.done, remaining: sum.remaining + entry.remaining }),
    { done: 0, remaining: 0 },
  );

  return `
    <article class="print-page">
      <header class="print-head">
        <h1>${esc(t('print.title'))}</h1>
        <p class="print-sub">${esc(t('print.subtitle'))}</p>
        <p class="print-meta">
          ${esc(t('print.from', { date: dateMedium(model.profile.pubertyDate) }))}
          · ${esc(model.profile.location?.name || '')}
        </p>
        <p class="print-meta">${esc(
          t('print.generated', { date: dateLong(app.today) }),
        )}</p>
      </header>

      <section class="print-stats">
        ${stat(t('print.remaining'), number(projection.remaining))}
        ${stat(t('print.owed'), number(projection.total))}
        ${stat(t('print.done'), number(projection.done))}
        ${stat(t('print.pace'), number(projection.quota))}
        ${stat(
          t('print.finish'),
          projection.finishDate ? dateMedium(projection.finishDate) : '—',
        )}
      </section>

      <h2 class="print-h2">${esc(t('print.byYear'))}</h2>
      <table class="print-table">
        <thead>
          <tr>
            <th>${esc(t('print.year'))}</th>
            <th class="num">${esc(t('print.doneShort'))}</th>
            <th class="num">${esc(t('print.leftShort'))}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <th>${esc(t('print.summary'))}</th>
            <th class="num">${esc(number(totals.done))}</th>
            <th class="num">${esc(number(totals.remaining))}</th>
          </tr>
        </tfoot>
      </table>

      <p class="print-note">${esc(t('print.note'))}</p>

      <div class="print-actions no-print">
        <button class="btn" data-action="go" data-to="settings">${esc(t('print.back'))}</button>
        <button class="btn btn--primary" data-action="print-now">${esc(t('print.print'))}</button>
      </div>
    </article>
  `;
}

export const handlers = {
  'print-now': () => {
    window.print();
  },
};
