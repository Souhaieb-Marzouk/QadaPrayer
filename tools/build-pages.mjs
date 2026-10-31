/**
 * Renders the guide and the privacy note in three languages.
 *
 *   node tools/build-pages.mjs
 *
 * Output: guide.html / guide-ar.html / guide-fr.html and the same for privacy.
 */

import { writeFileSync } from 'node:fs';
import { PAGES, APP_URL } from '../site/pages.mjs';
import { DONATE, LANGS } from '../site/content.mjs';

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const FILES = {
  en: { guide: 'guide.html', privacy: 'privacy.html' },
  fr: { guide: 'guide-fr.html', privacy: 'privacy-fr.html' },
  ar: { guide: 'guide-ar.html', privacy: 'privacy-ar.html' },
};

function head(lang, title, description) {
  const alternates = LANGS.map(
    (entry) =>
      `<link rel="alternate" hreflang="${entry.code}" href="./${FILES[entry.code].guide}" />`,
  ).join('\n    ');

  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="theme-color" content="#06100f" />
    <link rel="icon" href="./app/assets/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./app/assets/icon-180.png" />
    ${alternates}
    <link rel="stylesheet" href="./site.css" />
  </head>`;
}

function nav(lang, current) {
  const languages = LANGS.map(
    (entry) =>
      `<a href="./${FILES[entry.code][current]}"${
        entry.code === lang.code ? ' aria-current="page"' : ''
      } lang="${entry.code}">${entry.label}</a>`,
  ).join('');

  return `    <header class="nav">
      <a class="nav__brand" href="./${lang.code === 'en' ? 'index.html' : `index-${lang.code}.html`}">
        <img src="./app/assets/icon-192.png" alt="" width="34" height="34" />
        <span>QadaPrayer</span>
      </a>
      <nav class="nav__links" aria-label="Sections">
        <a href="./${lang.code === 'en' ? 'index.html' : `index-${lang.code}.html`}#features">${esc(
          lang.code === 'fr' ? 'Fonctions' : lang.code === 'ar' ? 'المزايا' : 'Features',
        )}</a>
        <a href="./${FILES[lang.code].guide}"${current === 'guide' ? ' aria-current="page"' : ''}>${esc(
          lang.code === 'fr' ? 'Guide' : lang.code === 'ar' ? 'الدليل' : 'Guide',
        )}</a>
        <a href="./${FILES[lang.code].privacy}"${current === 'privacy' ? ' aria-current="page"' : ''}>${esc(
          lang.code === 'fr' ? 'Confidentialité' : lang.code === 'ar' ? 'الخصوصية' : 'Privacy',
        )}</a>
      </nav>
      <div class="nav__end">
        <div class="lang" aria-label="Language">${languages}</div>
        <a class="btn btn--sm btn--primary" href="${APP_URL}">${esc(PAGES[lang.code].appLabel)}</a>
      </div>
    </header>`;
}

const SHOTS = [
  { src: `${APP_URL}?demo=1&route=today`, caption: 'Today' },
  { src: `${APP_URL}?demo=1&route=calendar&year=2010&calmonth=4`, caption: 'Calendar' },
  { src: `${APP_URL}?demo=1&route=stats`, caption: 'Progress' },
];

function guide(lang) {
  const page = PAGES[lang.code];

  const sections = page.guideSections
    .map(
      (section, index) => `        <section class="guide__step" id="step-${index + 1}">
          <span class="guide__num">${index + 1}</span>
          <div>
            <h2>${esc(section.t)}</h2>
            <p>${esc(section.b)}</p>
          </div>
        </section>`,
    )
    .join('\n');

  const shots = SHOTS.map(
    (shot) => `        <figure class="preview">
          <div class="preview__frame">
            <iframe src="${shot.src}" title="${esc(shot.caption)}" loading="lazy"></iframe>
          </div>
          <figcaption>${esc(shot.caption)}</figcaption>
        </figure>`,
  ).join('\n');

  return [
    head(lang, page.guideTitle, page.guideLead),
    '  <body>',
    nav(lang, 'guide'),
    '',
    '    <main class="section">',
    '      <header class="section__head">',
    `        <span class="eyebrow">QadaPrayer</span>`,
    `        <h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${esc(page.guideTitle)}</h1>`,
    `        <p class="section__lead">${esc(page.guideLead)}</p>`,
    '      </header>',
    '',
    '      <div class="guide">',
    sections,
    '      </div>',
    '',
    '      <div class="section-title" style="margin-top:2.4rem"><h2>Screens</h2></div>',
    '      <p class="section__lead">Live, running in your browser — not pictures.</p>',
    '      <div class="previews">',
    shots,
    '      </div>',
    '',
    `      <a class="btn btn--primary" style="margin-top:1.6rem" href="${APP_URL}">${esc(
      page.appLabel,
    )}</a>`,
    '      <a class="btn btn--ghost" style="margin-top:1.6rem;margin-inline-start:.6rem" href="./' +
      FILES[lang.code].privacy +
      '">' +
      esc(page.privacyTitle) +
      '</a>',
    '    </main>',
    '',
    '    <footer class="footer">',
    '      <div class="footer__brand">',
    '        <img src="./app/assets/icon-192.png" alt="" width="28" height="28" />',
    '        <span>QadaPrayer</span>',
    '      </div>',
    `      <p class="footer__note">${esc(page.privacyLead)}</p>`,
    '    </footer>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

function privacy(lang) {
  const page = PAGES[lang.code];

  const points = page.privacyPoints
    .map((point) => `          <li>${esc(point)}</li>`)
    .join('\n');

  return [
    head(lang, `${page.privacyTitle} — QadaPrayer`, page.privacyLead),
    '  <body>',
    nav(lang, 'privacy'),
    '',
    '    <main class="section">',
    '      <header class="section__head">',
    `        <span class="eyebrow">QadaPrayer</span>`,
    `        <h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${esc(page.privacyTitle)}</h1>`,
    `        <p class="section__lead">${esc(page.privacyLead)}</p>`,
    '      </header>',
    '',
    '      <div class="card card--pad">',
    '        <ul class="privacy__list">',
    points,
    '        </ul>',
    '      </div>',
    '',
    `      <p class="section__lead" style="margin-top:1.2rem">${esc(page.privacyFoot)}</p>`,
    `      <a class="btn btn--ghost" href="${DONATE.repo}/issues">GitHub issues</a>`,
    `      <a class="btn btn--primary" style="margin-inline-start:.6rem" href=".${
      lang.code === 'en' ? '/index.html' : `/${FILES[lang.code].guide}`
    }">${esc(page.back)}</a>`,
    '    </main>',
    '',
    '    <footer class="footer">',
    '      <div class="footer__brand">',
    '        <img src="./app/assets/icon-192.png" alt="" width="28" height="28" />',
    '        <span>QadaPrayer</span>',
    '      </div>',
    `      <p class="footer__note">${esc(page.privacyLead)}</p>`,
    '    </footer>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

let count = 0;
for (const lang of LANGS) {
  writeFileSync(FILES[lang.code].guide, guide(lang), 'utf8');
  writeFileSync(FILES[lang.code].privacy, privacy(lang), 'utf8');
  count += 2;
  console.log(`  + ${FILES[lang.code].guide}, ${FILES[lang.code].privacy}`);
}

console.log(`Pages: ${count}.`);
