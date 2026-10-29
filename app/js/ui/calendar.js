/** Calendar: year heat map → month → day, plus bulk editing. */

import { t, number, monthName, monthShort, weekdayNames, yearLabel } from '../i18n.js';
import {
  addDays,
  dayOfISO,
  daysInMonth,
  endOfMonth,
  toISO,
  weekdayOf,
} from '../core/dates.js';
import { esc } from './dom.js';
import { icon } from './icons.js';

function monthDays(month, year) {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, i) => toISO({ y: year, m: month, d: i + 1 }));
}

function yearBounds(model, today) {
  return {
    min: model.profile.pubertyDate ? Number(model.profile.pubertyDate.slice(0, 4)) : Number(today.slice(0, 4)),
    max: Number(today.slice(0, 4)),
  };
}

function renderMiniMonth(app, model, year, month) {
  const first = toISO({ y: year, m: month, d: 1 });
  const offset = weekdayOf(first);
  const days = monthDays(month, year);
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push('<span class="mini-cell" data-s="before"></span>');
  for (const date of days) {
    const status = model.dayStatus(date);
    cells.push(`<span class="mini-cell" data-s="${status}"></span>`);
  }
  while (cells.length % 7 !== 0) cells.push('<span class="mini-cell" data-s="before"></span>');

  return `
    <button class="month-card" data-action="open-month" data-month="${month}">
      <div class="month-card__name">${esc(monthShort(month))}</div>
      <div class="mini-grid">${cells.join('')}</div>
    </button>`;
}

function renderYear(app, model) {
  const year = app.cal.year;
  const bounds = yearBounds(model, app.today);
  const months = Array.from({ length: 12 }, (_, i) => renderMiniMonth(app, model, year, i + 1));

  return `
    <div class="cal-head">
      <button class="icon-btn" data-action="cal-prev" ${
        year <= bounds.min ? 'disabled' : ''
      } aria-label="${esc(t('common.back'))}">${icon('chevron-left')}</button>
      <div class="cal-head__title">${esc(yearLabel(year))}</div>
      <div class="cal-head__nav">
        <button class="icon-btn" data-action="cal-next" ${
          year >= bounds.max ? 'disabled' : ''
        } aria-label="${esc(t('common.next'))}">${icon('chevron-right')}</button>
      </div>
    </div>
    <p class="field__hint">${esc(t('calendar.legend'))}</p>
    <div class="year-grid">${months.join('')}</div>
    ${renderLegend()}
    <button class="btn btn--ghost btn--block" data-action="open-bulk">${icon('edit')} ${esc(
      t('calendar.bulk'),
    )}</button>
  `;
}

function renderLegend() {
  return `
    <div class="legend">
      <span class="legend__item"><span class="legend__swatch" data-s="done"></span>${esc(t('status.done'))}</span>
      <span class="legend__item"><span class="legend__swatch" data-s="partial"></span>${esc(t('status.partial'))}</span>
      <span class="legend__item"><span class="legend__swatch" data-s="missed"></span>${esc(t('status.missed'))}</span>
      <span class="legend__item"><span class="legend__swatch" data-s="exempt"></span>${esc(t('status.exempt'))}</span>
    </div>`;
}

function renderMonth(app, model) {
  const { year, month } = app.cal;
  const first = toISO({ y: year, m: month, d: 1 });
  const offset = weekdayOf(first);
  const days = monthDays(month, year);
  const weekdays = weekdayNames();

  const blanks = Array.from({ length: offset }, () => '<span></span>').join('');
  const cells = days
    .map((date) => {
      const status = model.dayStatus(date);
      const marks = Array.from({ length: 5 }, (_, i) => {
        const value = model.get(dayOfISO(date) * 5 + i);
        return `<span class="cal-cell__dot" data-done="${value === 1 ? 1 : 0}"></span>`;
      }).join('');
      return `
        <button class="cal-cell" data-s="${status}" data-today="${date === app.today ? 1 : 0}"
          data-action="open-day" data-date="${date}">
          <span>${esc(String(Number(date.slice(8, 10))))}</span>
          <span class="cal-cell__dots">${marks}</span>
        </button>`;
    })
    .join('');

  const total = days.length;
  const done = days.filter((date) => model.dayStatus(date) === 'done').length;

  return `
    <div class="cal-head">
      <button class="icon-btn" data-action="cal-back" aria-label="${esc(t('common.back'))}">${icon(
        'chevron-left',
      )}</button>
      <div class="cal-head__title">${esc(`${monthName(month, year)} ${yearLabel(year)}`)}</div>
      <div class="cal-head__nav">
        <span class="pill pill--gold">${esc(`${done}/${total}`)}</span>
      </div>
    </div>
    <div class="cal-grid">
      ${weekdays.map((name) => `<span class="cal-wd">${esc(name.slice(0, 2))}</span>`).join('')}
      ${blanks}
      ${cells}
    </div>
    ${renderLegend()}
    <button class="btn btn--ghost btn--block" data-action="open-bulk">${icon('edit')} ${esc(
      t('calendar.bulk'),
    )}</button>
  `;
}

export function render(app) {
  const model = app.model;
  const header = `
    <div class="section-title">
      <h2>${esc(t('calendar.title'))}</h2>
      <span class="link">${esc(t('calendar.qada'))}</span>
    </div>`;

  if (!app.cal.month) return header + renderYear(app, model);
  return header + renderMonth(app, model);
}

export const handlers = {
  'cal-prev': (app) => {
    const bounds = yearBounds(app.model, app.today);
    app.cal.year = Math.max(bounds.min, app.cal.year - 1);
    app.render({ preserveScroll: true });
  },
  'cal-next': (app) => {
    const bounds = yearBounds(app.model, app.today);
    app.cal.year = Math.min(bounds.max, app.cal.year + 1);
    app.render({ preserveScroll: true });
  },
  'open-month': (app, el) => {
    app.cal.month = Number(el.dataset.month);
    window.scrollTo({ top: 0 });
    app.render();
  },
  'cal-back': (app) => {
    app.cal.month = null;
    window.scrollTo({ top: 0 });
    app.render();
  },
  'open-day': (app, el) => {
    app.openSheet('day', { date: el.dataset.date });
  },
  'open-bulk': (app) => {
    const model = app.model;
    app.openSheet('bulk', {
      from: model.profile.pubertyDate || addDays(app.today, -365),
      to: addDays(app.today, -1),
      mode: 'done',
    });
  },
};
