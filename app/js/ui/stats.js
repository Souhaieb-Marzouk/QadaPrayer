/** Progress: the numbers that tell the user they are actually moving. */

import { t, number, percent, dateMedium, weekdayNames, dateShort } from '../i18n.js';
import { addDays, startOfMonth, weekdayOf } from '../core/dates.js';
import { clock, esc, ringWithCenter } from './dom.js';
import { icon } from './icons.js';

function barChart(app, model) {
  const days = model.recentActivity(app.today, 7);
  const weekdays = weekdayNames();
  return `
    <div class="bar-chart">
      ${days
        .map((day) => {
          const ratio = day.owed ? day.done / day.owed : 0;
          const date = new Date(`${day.dateISO}T12:00:00Z`);
          const label = weekdays[weekdayOf(day.dateISO)].slice(0, 2);
          return `
            <div class="bar" title="${esc(dateShort(day.dateISO))} · ${day.done}/${day.owed}">
              <div class="bar__fill" style="height:${Math.max(4, ratio * 100)}%;opacity:${
                ratio ? 1 : 0.25
              }"></div>
              <span class="bar__label">${esc(label)}</span>
            </div>`;
        })
        .join('')}
    </div>`;
}

function milestones(projection) {
  const steps = [
    [0.1, 'stats.milestone10'],
    [0.25, 'stats.milestone25'],
    [0.5, 'stats.milestone50'],
    [0.75, 'stats.milestone75'],
    [1, 'stats.milestone100'],
  ];
  return `
    <div class="milestones">
      ${steps
        .map(
          ([threshold, key]) => `
        <div class="milestone" data-reached="${projection.progress >= threshold ? 1 : 0}">
          <span class="milestone__dot">${projection.progress >= threshold ? icon('check') : ''}</span>
          <span>${esc(t(key))}</span>
          <span class="dim" style="margin-inline-start:auto">${esc(percent(threshold))}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}

export function render(app) {
  const model = app.model;
  const projection = model.projection();
  const simQuota = app.simQuota ?? projection.quota;
  const simDays = simQuota > 0 ? Math.ceil(projection.remaining / simQuota) : null;
  const simFinish = simDays && simDays < 365 * 200 ? addDays(app.today, simDays) : null;

  const ring = ringWithCenter(
    projection.progress,
    `<div><div class="ring__number">${esc(percent(projection.progress))}</div><div class="ring__unit">${esc(
      t('stats.percent'),
    )}</div></div>`,
  );

  const streaks = model.streaks(app.today);
  const week = model.rangeSummary(addDays(app.today, -6), app.today);
  const month = model.rangeSummary(startOfMonth(app.today), app.today);

  return `
    <div class="section-title">
      <h2>${esc(t('stats.title'))}</h2>
      <span class="link">${esc(t('stats.since', { date: dateMedium(model.profile.pubertyDate) }))}</span>
    </div>

    <section class="hero">
      ${ring}
      <div class="hero__body">
        <div class="hero__label">${esc(t('stats.remaining'))}</div>
        <div class="hero__value">${esc(number(projection.remaining))}</div>
        <div class="hero__meta">${esc(
          t('common.prayers', { n: number(projection.remaining) }),
        )}</div>
        <div class="hero__today">
          <span>${esc(t('stats.total'))} ${esc(number(projection.total))}</span>
        </div>
      </div>
    </section>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat__label">${esc(t('stats.done'))}</div>
        <div class="stat__value">${esc(number(projection.done))}</div>
      </div>
      <div class="stat">
        <div class="stat__label">${esc(t('stats.total'))}</div>
        <div class="stat__value">${esc(number(projection.total))}</div>
      </div>
      <div class="stat">
        <div class="stat__label">${esc(t('stats.pace'))}</div>
        <div class="stat__value">${esc(number(projection.quota))}</div>
        <div class="stat__hint">${esc(t('stats.paceValue', { n: number(projection.quota) }))}</div>
      </div>
      <div class="stat">
        <div class="stat__label">${esc(t('stats.net'))}</div>
        <div class="stat__value" style="color:${projection.net >= 0 ? 'var(--ok)' : 'var(--danger)'}">${
          projection.net >= 0 ? '+' : ''
        }${esc(number(projection.net))}</div>
        <div class="stat__hint">${esc(t('stats.netValue', { n: number(projection.net) }))}</div>
      </div>
    </div>

    <div class="card card--pad card--gold">
      <div class="stat__label">${esc(t('stats.finish'))}</div>
      <div class="stat__value" style="font-size:1.1rem">${esc(
        projection.finishDate ? dateMedium(projection.finishDate) : t('onboarding.summaryUnknown'),
      )}</div>
      <div class="stat__hint">${esc(t('stats.netHint'))}</div>
    </div>

    <div class="section-title"><h2>${esc(t('stats.momentum'))}</h2></div>
    <div class="card card--pad">
      <div class="stat-grid" style="margin-bottom:.7rem">
        <div class="stat">
          <div class="stat__label">${esc(t('stats.streak'))}</div>
          <div class="stat__value">${esc(
            streaks.current === 1
              ? t('stats.streakOne')
              : t('stats.streakDays', { n: number(streaks.current) }),
          )}</div>
        </div>
        <div class="stat">
          <div class="stat__label">${esc(t('stats.best'))}</div>
          <div class="stat__value">${esc(
            streaks.best === 1
              ? t('stats.streakOne')
              : t('stats.streakDays', { n: number(streaks.best) }),
          )}</div>
        </div>
      </div>
      <button class="btn btn--ghost btn--sm btn--block" data-action="open-review">${esc(
        t('review.open'),
      )}</button>
      <div class="list">
        <div class="list__row" style="padding:.5rem 0">
          <span class="list__label">${esc(t('stats.week'))}</span>
          <span class="list__value">${esc(
            t('stats.daysComplete', { done: number(week.complete), total: number(week.days) }),
          )}</span>
        </div>
        <div class="list__row" style="padding:.5rem 0;border-bottom:0">
          <span class="list__label">${esc(t('stats.month'))}</span>
          <span class="list__value">${esc(
            t('stats.daysComplete', { done: number(month.complete), total: number(month.days) }),
          )}</span>
        </div>
      </div>
    </div>

    <div class="section-title"><h2>${esc(t('stats.last7'))}</h2></div>
    <div class="card card--pad">
      ${barChart(app, model)}
      <div class="stat__hint" style="margin-top:.4rem">${esc(t('stats.last7Hint'))}</div>
    </div>

    <div class="section-title"><h2>${esc(t('stats.milestones'))}</h2></div>
    <div class="card card--pad">${milestones(projection)}</div>

    <div class="section-title"><h2>${esc(t('stats.simulation'))}</h2></div>
    <div class="card card--pad">
      <p class="field__hint" style="margin-bottom:.5rem">${esc(t('stats.simulationHint'))}</p>
      <input type="range" min="0" max="20" step="1" value="${simQuota}" data-live="sim-quota"
        aria-label="${esc(t('settings.pace'))}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:.3rem">
        <strong id="sim-label">${esc(t('stats.paceValue', { n: number(simQuota) }))}</strong>
        <span class="dim" id="sim-finish">${esc(simFinish ? dateMedium(simFinish) : '—')}</span>
      </div>
      <button class="btn btn--primary btn--block" style="margin-top:.7rem" data-action="apply-pace" data-quota="${simQuota}" ${
        simQuota === projection.quota ? 'disabled' : ''
      }>${esc(t('stats.applyPace'))}</button>
    </div>
  `;
}

export const handlers = {
  'apply-pace': (app, el) => {
    const quota = Number(el.dataset.quota);
    app.simQuota = null;
    app.commit((model) => model.setQuota(quota), { message: t('settings.saved') });
  },

  'open-review': (app) => {
    app.route = 'review';
    if (location.hash !== '#/review') history.replaceState(null, '', '#/review');
    window.scrollTo({ top: 0 });
    app.render();
  },
};

export const live = {
  'sim-quota': (app, el) => {
    const quota = Number(el.value);
    app.simQuota = quota;
    const projection = app.model.projection();
    const days = quota > 0 ? Math.ceil(projection.remaining / quota) : null;
    const finish = days && days < 365 * 200 ? addDays(app.today, days) : null;
    const label = document.getElementById('sim-label');
    const finishEl = document.getElementById('sim-finish');
    if (label) label.textContent = t('stats.paceValue', { n: number(quota) });
    if (finishEl) finishEl.textContent = finish ? dateMedium(finish) : '—';
    const button = document.querySelector('[data-action="apply-pace"]');
    if (button) {
      button.dataset.quota = String(quota);
      // The button is only meaningful when the value differs from the saved pace.
      button.disabled = quota === projection.quota;
    }
  },
};
