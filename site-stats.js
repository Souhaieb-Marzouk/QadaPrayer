/**
 * "Downloaded N times" — read from a small JSON file that the build refreshes
 * from the GitHub API. No cookies, no identifiers, nothing sent back.
 */
(async () => {
  const line = document.getElementById('stats-line');
  if (!line) return;

  try {
    const response = await fetch('./stats.json', { cache: 'no-store' });
    if (!response.ok) return;
    const stats = await response.json();
    const count = Number(stats.downloads) || 0;
    if (count < 1) return;

    const lang = document.documentElement.lang || 'en';
    const n = new Intl.NumberFormat(lang).format(count);
    const text =
      lang === 'fr'
        ? `Téléchargé ${n} fois`
        : lang === 'ar'
          ? `\u062a\u0645 \u062a\u0646\u0632\u064a\u0644\u0647 ${n} \u0645\u0631\u0629`
          : `Downloaded ${n} times`;

    line.textContent = text;
    line.hidden = false;
  } catch {
    /* the number is decoration, never a reason to fail the page */
  }
})();
