/**
 * Review: a page that answers "how am I actually doing?"
 *
 * Everything here is derived — no new state, no new storage. It reads the same
 * plan the rest of the app uses, so it can never disagree with Today.
 */

import { t, number, dateMedium, dateShort, weekdayNames } from '../i18n.js';
import { addDays, startOfMonth, weekdayOf } from '../core/dates.js';
import { esc, ringWithCenter } from './dom.js';
import { icon } from './icons.js';

function dayRow(model, dateISO, label) {
  const tally = model.dayTally(dateISO);
  const ratio = tally.owed ? tally.done / tally.owed : 0;
  const state =
    tally.owed === 0 ? 'empty' : ratio >= 1 ? 'full' : ratio > 0 ? 'part' : 'none';

  return `
    <div class="review__day" title="${esc(dateShort(dateISO))}">
      <span class="review__bar review__bar--${state}" style="height:${Math.max(
        6,
        Math.round(ratio * 100),
      )}%"></span>
      <span class="review__dow">${esc(label || '')}</span>
    </div>`;
}

export function render(app) {
  const model = app.model;
  const projection = model.projection();
  const week = model.rangeSummary(addDays(app.today, -6), app.today);
  const previous = model.rangeSummary(addDays(app.today, -13), addDays(app.today, -7));
  const month = model.rangeSummary(startOfMonth(app.today), app.today);
  const streaks = model.streaks(app.today);

  const days = model.recentActivity(app.today, 28);
  const weekdays = weekdayNames();

  const scored = days.filter((day) => day.owed > 0);
  const best = scored.reduce(
    (top, day) => (!top || day.done / day.owed > top.done / top.owed ? day : top),
    null,
  );
  const weakest = scored.reduce(
    (low, day) => (!low || day.done / day.owed < low.done / low.owed ? day : low),
    null,
  );

  const weeks = [0, 1, 2, 3].map((offset) => {
    const end = addDays(app.today, -offset * 7);
    const start = addDays(end, -6);
    return model.rangeSummary(start, end);
  });

  const ring = ringWithCenter(
    projection.progress,
    `<div><div class="ring__number">${esc(number(projection.remaining))}</div><div class="ring__unit">${esc(
      t('today.remaining'),
    )}</div></div>`,
  );

  const stat = (label, value, hint) => `
    <div class="stat">
      <div class="stat__label">${esc(label)}</div>
      <div class="stat__value">${esc(value)}</div>
      ${hint ? `<div class="stat__hint">${esc(hint)}</div>` : ''}
    </div>`;

  return `
    <div class="section-title">
      <h2>${esc(t('review.title'))}</h2>
      <button class="link" data-action="review-back">${esc(t('review.back'))}</button>
    </div>

    <section class="hero">
      ${ring}
      <div class="hero__body">
        <div class="hero__label">${esc(t('review.streak'))}</div>
        <div class="hero__value">${esc(
          streaks.current === 1 ? t('stats.streakOne') : t('stats.streakDays', { n: number(streaks.current) }),
        )}</div>
        <div class="hero__meta">${esc(
          `${t('stats.best')}: ${
            streaks.best === 1 ? t('stats.streakOne') : t('stats.streakDays', { n: number(streaks.best) })
          }`,
        )}</div>
      </div>
    </section>

    <div class="card card--pad" style="margin-top:.9rem">
      <div class="stat__label">${esc(t('review.breakdown'))}</div>
      <div class="review__days">
        ${days
          .map((day) =>
            dayRow(model, day.dateISO, (weekdays[weekdayOf(day.dateISO)] || '').slice(0, 2)),
          )
          .join('')}
      </div>
      <div class="review__legend dim">
        <span>${esc(dateShort(days[0]?.dateISO || app.today))}</span>
        <span>${esc(dateShort(app.today))}</span>
      </div>
    </div>

    <div class="card card--pad" style="margin-top:.9rem">
      <div class="stat-grid">
        ${stat(
          t('review.week'),
          t('review.days', { done: number(week.complete), total: number(week.days) }),
          `${week.done}/${week.owed}`,
        )}
        ${stat(
          t('review.lastWeek'),
          t('review.days', { done: number(previous.complete), total: number(previous.days) }),
          `${previous.done}/${previous.owed}`,
        )}
        ${stat(
          t('review.month'),
          t('review.days', { done: number(month.complete), total: number(month.days) }),
          `${month.done}/${month.owed}`,
        )}
        ${stat(
          t('review.bestDay'),
          best ? esc(dateShort(best.dateISO)) : '—',
          best ? `${best.done}/${best.owed}` : '',
        )}
      </div>
    </div>

    <div class="card card--pad" style="margin-top:.9rem">
      <div class="stat__label">${esc(t('review.weakest'))}</div>
      <div class="stat__value" style="font-size:1rem">${esc(
        weakest ? dateShort(weakest.dateISO) : '—',
      )}</div>
      <div class="stat__hint">${esc(weakest ? `${weakest.done}/${weakest.owed}` : t('review.none'))}</div>
    </div>

    <div class="section-title"><h2>${esc(t('review.breakdown'))}</h2></div>
    <div class="card">
      <div class="list">
        ${weeks
          .map(
            (summary, index) => `
          <div class="list__row">
            <span class="list__label">${
              index === 0 ? esc(t('review.week')) : esc(dateMedium(addDays(app.today, -index * 7)))
            }</span>
            <span class="list__value">${esc(
              t('review.days', { done: number(summary.complete), total: number(summary.days) }),
            )}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <button class="btn btn--ghost btn--block" style="margin-top:.8rem" data-action="review-back">
      ${icon('chevronLeft')} ${esc(t('review.back'))}
    </button>
  `;
}

export const handlers = {
  'review-back': (app) => {
    app.route = 'stats';
    if (location.hash !== '#/stats') history.replaceState(null, '', '#/stats');
    window.scrollTo({ top: 0 });
    app.render();
  },
};
