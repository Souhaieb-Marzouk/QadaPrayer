/**
 * Build-time constants and outbound links.
 *
 * Replace the support links with your own handles before publishing —
 * nothing else in the codebase needs to change.
 */

export const VERSION = '0.17.1';

export const LINKS = {
  koFi: 'https://ko-fi.com/cyberpulseacademy',
  payPal: 'https://www.paypal.com/donate/?hosted_button_id=KNUSPQTVR9WCU',
  repository: 'https://github.com/Souhaieb-Marzouk/QadaPrayer',
  website: 'https://souhaieb-marzouk.github.io/QadaPrayer/',
  // Base URL of the sync worker (see infra/README.md). Empty hides the card.
  syncEndpoint: 'https://qada-sync.marzouk-souhaieb.workers.dev',
};

export function supportsConfigured() {
  return !/REPLACE_ME/.test(LINKS.koFi + LINKS.payPal);
}

export const METHOD_LABELS = {
  tunisia: 'Tunisia — 18° / 18°',
  mwl: 'Muslim World League — 18° / 17°',
  egypt: 'Egyptian — 19.5° / 17.5°',
  karachi: 'Karachi — 18° / 18°',
  dubai: 'Dubai — 18.2° / 18.2°',
  isna: 'ISNA — 15° / 15°',
  france: 'France — 12° / 12°',
  ummAlQura: 'Umm al-Qura — 18.5° / 90 min',
  custom: 'Custom',
};
