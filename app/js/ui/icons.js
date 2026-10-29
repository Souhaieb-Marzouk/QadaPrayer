/**
 * Inline SVG icon set — 24×24, stroke based, inherits `currentColor`.
 * No icon font, no network, no dependency.
 */

const PATHS = {
  logo: `<path d="M12 2.6 19.4 6.6v8.8L12 19.4 4.6 15.4V6.6z" opacity=".55"/><path d="M12 5.2v9.2"/><path d="M9.4 8.1a4 4 0 1 0 0 5.6" /><circle cx="12" cy="10.9" r="1.15" fill="currentColor" stroke="none"/>`,
  check: `<path d="M4.5 12.6 9.2 17.3 19.6 6.9"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  'chevron-left': `<path d="M14.5 5.5 8 12l6.5 6.5"/>`,
  'chevron-right': `<path d="M9.5 5.5 16 12l-6.5 6.5"/>`,
  'arrow-right': `<path d="M4 12h15"/><path d="M13.5 6.5 20 12l-6.5 5.5"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  home: `<path d="M4 10.5 12 4l8 6.5V20H4z"/>`,
  calendar: `<rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>`,
  chart: `<path d="M5 19V11M12 19V5M19 19v-5"/>`,
  gear: `<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>`,
  sun: `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/>`,
  subh: `<path d="M3 18h18"/><path d="M6.5 18a5.5 5.5 0 0 1 11 0"/><path d="M12 4.2v3.2M5.6 6.8l1.7 1.7M18.4 6.8l-1.7 1.7"/><path d="M2.6 21h18.8"/>`,
  dhuhr: `<circle cx="12" cy="10.5" r="4"/><path d="M12 1.8v1.9M12 17.3v1.9M2.2 10.5h1.9M19.9 10.5h1.9M5.1 3.6l1.3 1.3M17.6 16.1l1.3 1.3M18.9 3.6l-1.3 1.3M6.4 16.1l-1.3 1.3"/><path d="M3 21h18"/>`,
  asr: `<circle cx="15" cy="8.5" r="3.6"/><path d="M3 20.5h18"/><path d="M3 20.5 11 12l4.5 4.5"/><path d="M18.5 2.4v1.7M23 8.5h-1.7M21.2 4.2l-1.2 1.2"/>`,
  maghreb: `<path d="M3 17.5h18"/><path d="M7 17.5a5 5 0 0 1 10 0"/><path d="M12 3.5v6"/><path d="M9.3 7.2 12 9.9l2.7-2.7"/><path d="M2.6 21h18.8"/>`,
  isha: `<path d="M20 14.4A8.2 8.2 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4z"/><path d="M16.5 3.2v2M20 6.7h-2"/>`,
  search: `<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5 20.5 20.5"/>`,
  pin: `<path d="M12 21s6.6-6 6.6-11a6.6 6.6 0 1 0-13.2 0C5.4 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>`,
  lock: `<rect x="4.8" y="10.2" width="14.4" height="10" rx="3"/><path d="M8.4 10.2V7.8a3.6 3.6 0 0 1 7.2 0v2.4"/>`,
  shield: `<path d="M12 3 19 6v5.6c0 4.4-3 7.6-7 9.4-4-1.8-7-5-7-9.4V6z"/><path d="M9 12l2.2 2.2L15.4 10"/>`,
  download: `<path d="M12 4v10.5"/><path d="M7.8 10.6 12 14.8l4.2-4.2"/><path d="M4.5 18.5h15"/>`,
  upload: `<path d="M12 20V9.5"/><path d="M7.8 13.4 12 9.2l4.2 4.2"/><path d="M4.5 4h15"/>`,
  heart: `<path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3C19.5 15.4 12 20 12 20z"/>`,
  trash: `<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.8 12.2h9.4L17.5 7"/>`,
  globe: `<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.6 2.4 3.9 5.3 3.9 8.4S14.6 18 12 20.4c-2.6-2.4-3.9-5.3-3.9-8.4S9.4 6 12 3.6z"/>`,
  bell: `<path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6"/><path d="M4.5 17h15"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>`,
  info: `<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.4"/><circle cx="12" cy="8.2" r=".9" fill="currentColor" stroke="none"/>`,
  clock: `<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3.2 2"/>`,
  spark: `<path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6l-1.9-5.8L4.3 10.9 10.1 9z"/>`,
  flame: `<path d="M12 21c3.4 0 5.6-2.2 5.6-5.2 0-3.6-3.6-5.4-4.4-9.8-2.4 1.4-3 3.6-3 5.2 0 1-.4 1.6-1 1.6-.7 0-1.1-.6-1.2-1.4C6.8 13 6.4 14.3 6.4 15.8 6.4 18.8 8.6 21 12 21z"/>`,
  edit: `<path d="M4 20h4l11-11-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>`,
  moonCheck: `<path d="M20 14.4A8.2 8.2 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4z"/><path d="M7.6 13.2 9.4 15l3-3"/>`,
};

export function icon(name, extraClass = '') {
  const body = PATHS[name] || PATHS.info;
  const cls = extraClass ? ` class="${extraClass}"` : '';
  return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const PRAYER_ICON = {
  subh: 'subh',
  dhuhr: 'dhuhr',
  asr: 'asr',
  maghreb: 'maghreb',
  isha: 'isha',
};

export const PRAYER_ARABIC = {
  subh: 'الصبح',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghreb: 'المغرب',
  isha: 'العشاء',
};
