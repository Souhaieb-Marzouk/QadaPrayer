/**
 * Builds the landing page in the three languages.
 *
 * One template, one content file: the three pages can never drift apart.
 *
 *   node tools/build-site.mjs
 */

import { writeFileSync } from 'node:fs';
import { CONTENT, DONATE, LANGS } from '../site/content.mjs';

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ICONS = ['▦', '☾', '↻', '☀', '✓', '⛨'];
const INSTALL_ICONS = ['↓', '⚙', '✓'];

function head(lang, c) {
  const alternates = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.code}" href="./${l.file}" />`,
  ).join('\n    ');

  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(c.meta.title)}</title>
    <meta name="description" content="${esc(c.meta.description)}" />
    <meta name="theme-color" content="#06100f" />
    <link rel="icon" href="./app/assets/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./app/assets/icon-180.png" />
    <meta property="og:title" content="${esc(c.meta.title)}" />
    <meta property="og:description" content="${esc(c.meta.description)}" />
    <meta property="og:image" content="./app/assets/icon-512.png" />
    <meta property="og:locale" content="${lang.code}" />
    ${alternates}
    <link rel="stylesheet" href="./site.css" />
  </head>`;
}

function nav(lang, c) {
  const languages = LANGS.map(
    (l) =>
      `<a href="./${l.file}"${l.code === lang.code ? ' aria-current="page"' : ''} lang="${l.code}">${
        l.label
      }</a>`,
  ).join('');

  return `    <header class="nav">
      <a class="nav__brand" href="./${lang.file}">
        <img src="./app/assets/icon-192.png" alt="" width="34" height="34" />
        <span>QadaPrayer</span>
      </a>
      <nav class="nav__links" aria-label="${esc(c.nav.features)}">
        <a href="#features">${esc(c.nav.features)}</a>
        <a href="#screens">${esc(c.nav.screens)}</a>
        <a href="#how">${esc(c.nav.how)}</a>
        <a href="#install">${esc(c.nav.install)}</a>
        <a href="#support">${esc(c.nav.support)}</a>
      </nav>
      <div class="nav__end">
        <div class="lang" aria-label="Language">${languages}</div>
        <a class="btn btn--sm btn--tip" href="#support">♥ ${esc(c.nav.tip)}</a>
        <a class="btn btn--sm btn--primary" href="#install">${esc(c.nav.download)}</a>
      </div>
    </header>`;
}

function hero(lang, c) {
  const facts = [c.hero.fact1, c.hero.fact2, c.hero.fact3]
    .map((fact) => `<li>${esc(fact)}</li>`)
    .join('\n            ');

  return `      <section class="hero">
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__text">
          <span class="eyebrow">${esc(c.hero.eyebrow)}</span>
          <h1>${esc(c.hero.h1a)}<br /><em>${esc(c.hero.h1b)}</em></h1>
          <p class="lead">${esc(c.hero.lead)}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="#install">${esc(c.hero.ctaPrimary)}</a>
            <a class="btn btn--ghost" href="./app/?demo=1">${esc(c.hero.ctaSecondary)}</a>
          </div>
          <ul class="hero__facts">
            ${facts}
          </ul>
        </div>

        <div class="hero__device">
          <div class="device">
            <div class="device__screen">
              <iframe
                src="./app/?demo=1&amp;lang=${lang.code}"
                title="QadaPrayer demo"
                loading="lazy"
                referrerpolicy="no-referrer"
              ></iframe>
            </div>
          </div>
          <p class="device__caption">${esc(c.demo.caption)}</p>
        </div>
      </section>`;
}

function features(c) {
  const cards = c.features.items
    .map(
      (item, index) => `          <article class="card">
            <span class="card__icon" aria-hidden="true">${ICONS[index % ICONS.length]}</span>
            <h3>${esc(item.t)}</h3>
            <p>${esc(item.b)}</p>
          </article>`,
    )
    .join('\n');

  return `      <section id="features" class="section">
        <header class="section__head">
          <span class="eyebrow">${esc(c.nav.features)}</span>
          <h2>${esc(c.features.title)}</h2>
${c.features.lead ? `          <p class="section__lead">${esc(c.features.lead)}</p>` : ''}
        </header>

        <div class="grid">
${cards}
        </div>
      </section>`;
}

const SCREEN_SRC = [
  './app/?demo=1&amp;route=today',
  './app/?demo=1&amp;route=calendar&amp;year=2010&amp;calmonth=4',
  './app/?demo=1&amp;route=stats',
  './app/?demo=1&amp;lang=ar&amp;route=today',
];

const SCREEN_TITLE = ['Today screen', 'Calendar screen', 'Progress screen', 'Arabic interface'];

function screens(c) {
  const figures = c.screens.captions
    .map(
      (caption, index) => `          <figure class="preview">
            <div class="preview__frame">
              <iframe src="${SCREEN_SRC[index]}" title="${SCREEN_TITLE[index]}" loading="lazy"></iframe>
            </div>
            <figcaption>${esc(caption)}</figcaption>
          </figure>`,
    )
    .join('\n');

  return `      <section id="screens" class="section section--alt">
        <header class="section__head">
          <span class="eyebrow">${esc(c.nav.screens)}</span>
          <h2>${esc(c.screens.title)}</h2>
          <p class="section__lead">${esc(c.screens.lead)}</p>
        </header>

        <div class="previews">
${figures}
        </div>
      </section>`;
}

function how(c) {
  const steps = c.how.steps
    .map(
      (step, index) => `          <li class="step">
            <span class="step__num">${index + 1}</span>
            <h3>${esc(step.t)}</h3>
            <p>${esc(step.b)}</p>
          </li>`,
    )
    .join('\n');

  return `      <section id="how" class="section">
        <header class="section__head">
          <span class="eyebrow">${esc(c.nav.how)}</span>
          <h2>${esc(c.how.title)}</h2>
        </header>

        <ol class="steps">
${steps}
        </ol>
      </section>`;
}

function card(title, sub, steps, cta, href, cls, note) {
  const items = steps
    .map(
      (step, index) => `              <li>
                <span class="mini-icon">${INSTALL_ICONS[index % INSTALL_ICONS.length]}</span>
                <div>
                  <strong>${esc(step.t)}</strong>
                  <p>${esc(step.b)}</p>
                </div>
              </li>`,
    )
    .join('\n');

  return `          <article class="install__card">
            <h3>${esc(title)}</h3>
            <p class="install__sub">${esc(sub)}</p>

            <ol class="install__steps">
${items}
            </ol>

            <a class="btn ${cls} btn--block" href="${href}">${esc(cta)}</a>
            <p class="install__note">${esc(note)}</p>
          </article>`;
}

function install(c) {
  const android = card(
    c.install.android.title,
    c.install.android.sub,
    c.install.android.steps,
    c.install.android.cta,
    `${DONATE.repo}/releases/latest`,
    'btn--primary',
    c.install.android.note,
  );
  const ios = card(
    c.install.ios.title,
    c.install.ios.sub,
    c.install.ios.steps,
    c.install.ios.cta,
    './app/',
    'btn--ghost',
    c.install.ios.note,
  );

  return `      <section id="install" class="section">
        <header class="section__head">
          <span class="eyebrow">${esc(c.nav.install)}</span>
          <h2>${esc(c.install.title)}</h2>
          <p class="section__lead">${esc(c.install.lead)}</p>
        </header>

        <div class="install">
${android}

${ios}
        </div>
      </section>`;
}

function support(c) {
  return `      <section id="support" class="section section--alt">
        <div class="support">
          <div>
            <span class="eyebrow">${esc(c.support.eyebrow)}</span>
            <h2>${esc(c.support.title)}</h2>
            <p class="lead">${esc(c.support.lead)}</p>
            <p class="support__funny">${esc(c.support.funny)}</p>
          </div>
          <div class="support__actions">
            <a class="btn btn--tip btn--lg" href="${DONATE.kofi}" target="_blank" rel="noopener noreferrer">
              ♥ ${esc(c.support.kofi)}
            </a>
            <a class="btn btn--ghost btn--lg" href="${DONATE.paypal}" target="_blank" rel="noopener noreferrer">
              ${esc(c.support.paypal)}
            </a>
            <p class="support__note">${esc(c.support.note)}</p>
          </div>
        </div>
      </section>`;
}

function faq(c) {
  const items = c.faq.items
    .map(
      (item) => `          <details>
            <summary>${esc(item.q)}</summary>
            <p>${esc(item.a)}</p>
          </details>`,
    )
    .join('\n');

  return `      <section class="section">
        <header class="section__head">
          <span class="eyebrow">FAQ</span>
          <h2>${esc(c.faq.title)}</h2>
        </header>
        <div class="faq">
${items}
        </div>
      </section>`;
}

function footer(c, lang) {
  return `    <footer class="footer">
      <div class="footer__brand">
        <img src="./app/assets/icon-192.png" alt="" width="28" height="28" />
        <span>QadaPrayer</span>
      </div>
      <p class="footer__note">${esc(c.footer.note)}</p>
      <nav class="footer__links" aria-label="Footer">
        <a href="./${lang.code === 'en' ? 'guide.html' : `guide-${lang.code}.html`}">${esc(
          lang.code === 'fr' ? 'Guide' : lang.code === 'ar' ? 'الدليل' : 'User guide',
        )}</a>
        <a href="./${lang.code === 'en' ? 'privacy.html' : `privacy-${lang.code}.html`}">${esc(
          lang.code === 'fr' ? 'Confidentialité' : lang.code === 'ar' ? 'الخصوصية' : 'Privacy',
        )}</a>
        <a href="./app/">${esc(c.footer.app)}</a>
        <a href="${DONATE.repo}">${esc(c.footer.source)}</a>
        <a href="${DONATE.repo}/blob/main/LICENSE">${esc(c.footer.licence)}</a>
        <a class="footer__tip" href="${DONATE.kofi}" target="_blank" rel="noopener noreferrer">
          ♥ ${esc(c.footer.tip)}
        </a>
      </nav>
      <div class="footer__donate">
        <a class="btn btn--sm btn--tip" href="${DONATE.kofi}" target="_blank" rel="noopener noreferrer">
          ♥ Ko-fi
        </a>
        <a class="btn btn--sm btn--ghost" href="${DONATE.paypal}" target="_blank" rel="noopener noreferrer">
          PayPal
        </a>
      </div>
    </footer>`;
}

function page(lang) {
  const c = CONTENT[lang.code];
  return [
    head(lang, c),
    '  <body>',
    nav(lang, c),
    '',
    '    <main>',
    hero(lang, c),
    '',
    features(c),
    '',
    screens(c),
    '',
    how(c),
    '',
    install(c),
    '',
    support(c),
    '',
    faq(c),
    '    </main>',
    '',
    footer(c, lang),
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

let written = 0;
for (const lang of LANGS) {
  const html = page(lang);
  writeFileSync(lang.file, html, 'utf8');
  written += 1;
  console.log(`  + ${lang.file} (${lang.code}, ${html.length} bytes)`);
}

console.log(`Site: ${written} pages.`);
