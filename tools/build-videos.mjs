/**
 * Renders videos.html / videos-fr.html / videos-ar.html from site/videos.mjs.
 *
 *   node tools/build-videos.mjs
 */

import { writeFileSync } from 'node:fs';
import { VIDEOS } from '../site/videos.mjs';
import { APP_URL } from '../site/pages.mjs';
import { LANGS } from '../site/content.mjs';

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FILES = { en: 'videos.html', fr: 'videos-fr.html', ar: 'videos-ar.html' };
const HOME = { en: 'index.html', fr: 'index-fr.html', ar: 'index-ar.html' };

const COPY = {
  en: {
    title: 'QadaPrayer — the walkthrough',
    lead: 'Six short parts, recorded on a phone, in order. Watch one, then do it.',
    watch: 'Watch',
    back: 'Back to the website',
    guide: 'Read the guide instead',
    note: 'Videos play in place, on the page. Nothing is loaded until you press play.',
  },
  fr: {
    title: 'QadaPrayer — le tour complet',
    lead: 'Six parties courtes, filmées sur un téléphone, dans l’ordre. Regardez-en une, puis faites-la.',
    watch: 'Regarder',
    back: 'Retour au site',
    guide: 'Lire le guide à la place',
    note: 'Les vidéos se lisent sur place. Rien n’est chargé avant que vous appuyiez sur play.',
  },
  ar: {
    title: 'QadaPrayer — الشرح الكامل',
    lead: 'ستة أجزاء قصيرة، مصوّرة على الهاتف، بالترتيب. شاهد واحدًا ثم طبّقه.',
    watch: 'شاهد',
    back: 'رجوع إلى الموقع',
    guide: 'اقرأ الدليل بدلًا من ذلك',
    note: 'تُشغَّل المقاطع في مكانها. لا يُحمَّل شيء قبل الضغط على تشغيل.',
  },
};

function page(lang) {
  const copy = COPY[lang.code];
  const items = VIDEOS.map((video, index) => {
    const text = video[lang.code] || video.en;
    return `        <article class="video">
          <h2 class="video__title"><span class="video__num">${index + 1}</span>${esc(text.t)}</h2>
          <p class="video__desc">${esc(text.d)}</p>
          <video class="video__player" controls preload="none" playsinline
            poster="./media/${esc(video.poster)}" src="./media/${esc(video.file)}">
            <a href="./media/${esc(video.file)}">${esc(copy.watch)}</a>
          </video>
        </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(copy.title)}</title>
    <meta name="description" content="${esc(copy.lead)}" />
    <meta name="theme-color" content="#06100f" />
    <link rel="icon" href="./app/assets/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="./site.css" />
  </head>
  <body>
    <header class="nav">
      <a class="nav__brand" href="./${HOME[lang.code]}">
        <img src="./app/assets/icon-192.png" alt="" width="34" height="34" />
        <span>QadaPrayer</span>
      </a>
      <div class="nav__end">
        <a class="btn btn--sm btn--primary" href="${APP_URL}">${esc(copy.watch)}</a>
      </div>
    </header>

    <main class="section">
      <header class="section__head">
        <span class="eyebrow">QadaPrayer</span>
        <h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">${esc(copy.title)}</h1>
        <p class="section__lead">${esc(copy.lead)}</p>
      </header>

      <div class="videos">
${items}
      </div>

      <p class="field__hint" style="margin-top:1.4rem">${esc(copy.note)}</p>
      <a class="btn btn--ghost" href="./${lang.code === 'en' ? 'index.html' : HOME[lang.code]}">${esc(copy.back)}</a>
      <a class="btn btn--primary" style="margin-inline-start:.6rem" href="./${
        lang.code === 'en' ? 'guide.html' : `guide-${lang.code}.html`
      }">${esc(copy.guide)}</a>
    </main>
  </body>
</html>
`;
}

for (const lang of LANGS) {
  writeFileSync(FILES[lang.code], page(lang), 'utf8');
  console.log(`  + ${FILES[lang.code]}`);
}
console.log('Videos: 3 pages.');
