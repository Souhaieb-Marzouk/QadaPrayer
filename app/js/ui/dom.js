/** Small rendering helpers shared by every screen. */

import { icon } from './icons.js';
import { t } from '../i18n.js';

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function cls(...names) {
  return names.filter(Boolean).join(' ');
}

/** Minutes after midnight → "05:13" (wraps past midnight). */
export function clock(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Countdown minutes → "1 h 12" / "12 min" using localised units. */
export function duration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return t('common.minutes', { n: total });
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return t('common.hours', { n: hours });
  return `${t('common.hours', { n: hours })} ${t('common.minutes', { n: rest })}`;
}

export function signed(minutes) {
  const value = Math.round(minutes);
  return value > 0 ? `+${value}` : String(value);
}

export function statusPill(status) {
  const map = {
    done: ['pill--done', 'status.done'],
    missed: ['pill--missed', 'status.missed'],
    active: ['pill--active', 'status.active'],
    upcoming: ['pill', 'status.upcoming'],
    exempt: ['pill--exempt', 'status.exempt'],
    partial: ['pill', 'status.partial'],
    before: ['pill', 'calendar.beforePuberty'],
    future: ['pill', 'calendar.future'],
  };
  const [tone, labelKey] = map[status] || ['pill', 'status.upcoming'];
  return `<span class="pill ${tone}">${esc(t(labelKey))}</span>`;
}

export function ring(percent, size = 8.6) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, percent));
  const offset = circumference * (1 - clamped);
  return `
    <div class="ring" style="--size:${size}rem" role="img" aria-label="${esc(
      t('stats.percent'),
    )} ${Math.round(clamped * 100)}%">
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="qadaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7fd1c0"/>
            <stop offset="55%" stop-color="#d4a24c"/>
            <stop offset="100%" stop-color="#f0cd8a"/>
          </linearGradient>
        </defs>
        <circle class="ring__track" cx="50" cy="50" r="${radius}"/>
        <circle class="ring__value" cx="50" cy="50" r="${radius}"
          stroke-dasharray="${circumference.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"/>
      </svg>
      <div class="ring__center">__CENTER__</div>
    </div>`;
}

export function emptyState(message, iconName = 'moonCheck') {
  return `<div class="empty">${icon(iconName)}<span>${esc(message)}</span></div>`;
}

export function notice(message, tone = 'info') {
  const clsName = tone === 'danger' ? 'notice notice--danger' : 'notice';
  return `<div class="${clsName}">${icon(tone === 'danger' ? 'info' : 'info')}<span>${message}</span></div>`;
}

/** Split a ring template so callers can inject their own centre content. */
export function ringWithCenter(percent, centreHtml, size = 8.6) {
  return ring(percent, size).replace('__CENTER__', centreHtml);
}
