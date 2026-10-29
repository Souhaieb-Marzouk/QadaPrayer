/** Today: the five prayers, with their make-ups woven underneath. */

import { t, number, percent, dateMedium, dateShort } from '../i18n.js';
import { PRAYERS, fromDayNumber, toISO } from '../core/dates.js';
import { prayerStateAt } from '../core/prayerTimes.js';
import { MARK_DONE, MARK_EXEMPT, slotIndex } from '../core/engine.js';
import { clock, duration, esc, ringWithCenter, statusPill } from './dom.js';
import { icon, PRAYER_ARABIC, PRAYER_ICON } from './icons.js';

const MAX_CHIPS = 8;

function statusOf(app, mark, prayer) {
  if (mark === MARK_EXEMPT) return 'exempt';
  if (mark === MARK_DONE) return 'done';
  const window = app.day?.windows?.[prayer];
  if (!window) return 'upcoming';
  if (app.now >= window.start && app.now < window.end) return 'active';
  if (app.now >= window.end) return 'missed';
  return 'upcoming';
}

function renderQadaChips(indices) {
  if (!indices.length) {
    return `<span class="qada-empty">${esc(t('today.emptyQueue'))}</span>`;
  }
  const shown = indices.slice(0, MAX_CHIPS);
  const rest = indices.length - shown.length;
  const chips = shown.map((index) => {
    const date = toISO(fromDayNumber(Math.floor(index / 5)));
    const prayer = PRAYERS[index % 5];
    return `<button class="qada" data-action="qada-chip" data-index="${index}" title="${esc(
      t(`prayer.${prayer}`),
    )} · ${esc(dateMedium(date))}">${esc(dateShort(date))}<span class="qada__sep">·</span>${esc(
      t(`prayer.${prayer}`),
    )}</button>`;
  });
  if (rest > 0) chips.push(`<span class="qada-empty">+${rest}</span>`);
  return chips.join('');
}

function renderPrayer(app, item) {
  const { prayer } = item;
  const status = statusOf(app, item.mark, prayer);
  const window = app.day.windows[prayer];
  const time = `${clock(window.start)} – ${clock(window.end)}`;

  return `
    <article class="prayer" data-state="${status}" data-prayer="${prayer}">
      <button class="prayer__head" data-action="prayer-sheet" data-prayer="${prayer}">
        <span class="prayer__check">${icon('check')}</span>
        <span class="prayer__body">
          <span class="prayer__name">
            <span>${esc(t(`prayer.${prayer}`))}</span>
            <span class="prayer__ar">${esc(PRAYER_ARABIC[prayer])}</span>
          </span>
          <span class="prayer__meta">
            <span class="prayer__time">${esc(time)}</span>
          </span>
        </span>
        <span class="prayer__right">${statusPill(status)}</span>
      </button>
      <div class="prayer__qada">
        ${
          item.qada.length
            ? `<span class="qada-empty">${esc(t('today.makeups'))}:</span>${renderQadaChips(item.qada)}`
            : `<span class="qada-empty">${esc(t('today.noMakeups'))}</span>`
        }
      </div>
    </article>`;
}

export function render(app) {
  const model = app.model;
  const projection = model.projection();
  const plan = model.plan(app.today);
  const state = prayerStateAt(app.day, app.now);

  const todayDone = PRAYERS.filter(
    (prayer) => model.get(slotIndex(app.today, prayer)) === MARK_DONE,
  ).length;
  const todayExempt = PRAYERS.filter(
    (prayer) => model.get(slotIndex(app.today, prayer)) === MARK_EXEMPT,
  ).length;

  const dots = PRAYERS.map((prayer) => {
    const mark = model.get(slotIndex(app.today, prayer));
    const name = mark === MARK_DONE ? 'dot dot--done' : mark === MARK_EXEMPT ? 'dot dot--exempt' : 'dot';
    return `<span class="${name}"></span>`;
  }).join('');

  const ring = ringWithCenter(
    projection.progress,
    `<div><div class="ring__number">${number(projection.remaining)}</div><div class="ring__unit">${esc(
      projection.remaining === 1 ? t('today.remainingOne') : t('today.remaining'),
    )}</div></div>`,
  );

  const nextKey = state.current || state.next;
  const nextTime = state.current
    ? app.day.windows[state.current].end
    : app.day.windows[state.next].start;
  const nextCountdown = state.current
    ? duration(app.day.windows[state.current].end - app.now)
    : duration(nextMinuteDistance(app.now, app.day.windows[state.next].start));

  const paused = plan.pausedMask !== 0;
  const pausedPrayer = t(`prayer.${PRAYERS[lowestBit(plan.pausedMask)]}`);

  return `
    <section class="hero">
      ${ring}
      <div class="hero__body">
        <div class="hero__label">${esc(t('stats.percent'))}</div>
        <div class="hero__value">${esc(percent(projection.progress))}</div>
        <div class="hero__meta">${esc(
          t('today.ofTotal', {
            total: number(projection.total),
            date: dateMedium(model.profile.pubertyDate),
          }),
        )}</div>
        <div class="hero__today">
          <span class="hero__dots">${dots}</span>
          <span>${esc(t('today.progressToday'))} ${todayDone} / ${Math.max(0, 5 - todayExempt)}</span>
        </div>
      </div>
    </section>

    <div class="next-prayer">
      <span class="next-prayer__icon">${icon(PRAYER_ICON[nextKey])}</span>
      <div>
        <div class="next-prayer__name">${esc(
          `${t(state.current ? 'today.now' : 'today.next')} · ${t(`prayer.${nextKey}`)}`,
        )}</div>
        <div class="next-prayer__time">${esc(clock(nextTime))}</div>
      </div>
      <span class="next-prayer__count">${esc(nextCountdown)}</span>
    </div>

    ${
      paused
        ? `<div class="notice">${icon('clock')}<span>${esc(
            t('today.paused', { prayer: pausedPrayer }),
          )}</span></div>
          <button class="btn btn--ghost btn--block" data-action="resume-today">${esc(
            t('today.resume'),
          )}</button>`
        : ''
    }

    <div class="section-title">
      <h2>${esc(t('nav.today'))}</h2>
      <span class="link">${esc(app.model.profile.location.name)}</span>
    </div>

    <div class="prayer-list">
      ${plan.items.map((item) => renderPrayer(app, item)).join('')}
    </div>

    ${
      projection.remaining === 0
        ? `<div class="notice">${icon('moonCheck')}<span>${esc(t('today.allDone'))}</span></div>`
        : ''
    }
    ${
      model.profile.quotaPrayers === 0
        ? `<div class="notice">${icon('info')}<span>${esc(t('today.quotaOff'))}</span></div>`
        : ''
    }
    <p class="dim center" style="font-size:.72rem;margin-top:.4rem">${esc(t('today.makeUpHint'))}</p>
  `;
}

function lowestBit(mask) {
  for (let i = 0; i < 5; i += 1) if ((mask >> i) & 1) return i;
  return 0;
}

function nextMinuteDistance(now, target) {
  return target >= now ? target - now : target + 1440 - now;
}

export const handlers = {
  'prayer-sheet': (app, el) => {
    app.openSheet('prayer', { date: app.today, prayer: el.dataset.prayer });
  },
  'qada-chip': (app, el) => {
    const index = Number(el.dataset.index);
    app.openSheet('prayer', {
      date: app.today,
      prayer: PRAYERS[index % 5],
      focusIndex: index,
    });
  },
  'resume-today': (app) => {
    app.commit((model) => model.clearPause(app.today), { message: t('today.resume') });
  },
};
