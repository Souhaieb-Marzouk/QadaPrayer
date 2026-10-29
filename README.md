# Qada

A private, offline tracker for the prayers you still owe — and a calm way to
make them up.

Qada counts every prayer from the day your obligation began until today, then
folds a small, steady number of make-ups into the five prayers you are praying
today. It is built on the Maliki position that missed prayers must be made up.

**[Open the app](app/)** · **[Local setup](docs/LOCAL-DEVELOPMENT.md)** · **[How it works](docs/ARCHITECTURE.md)**

---

## Features

- **Lifetime ledger** — from puberty (or the date you embraced Islam) to today,
  with bulk marking by day, month or year.
- **Interleaved make-ups** — pick a daily pace; the make-ups are distributed
  across today's five prayers in chronological order, starting at Dhuhr on the
  first obliged day.
- **Change the pace without rewriting history** — reducing your daily pace
  never alters a prayer you already made up.
- **Prayer times computed on the device** — any city, nine calculation methods,
  adjustable Asr shadow and per-prayer minute offsets.
- **Exemptions** — days that were not due are excluded from what you owe.
- **Progress you can feel** — remaining count, completion, projected finish
  date, seven-day activity and milestones.
- **Private by construction** — no account, no server, no analytics. Backups are
  files you own, optionally encrypted with a passphrase.
- **Arabic, English and French**, with full RTL layout, light/dark themes and a
  text-size setting.

## Install

- **Android** — download the latest `.apk` from
  [releases](../../releases/latest) and open it, or add this repository to
  [Obtainium](https://obtainium.imranr.dev/) for automatic updates.
- **iPhone / iPad** — open the app in Safari, tap *Share* → *Add to Home Screen*.
- **Desktop** — open the app in any modern browser.

Detailed steps: [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md).

## Run it locally

Requires Node.js 20 or newer. There is nothing to install.

```bash
node tools/serve.mjs        # http://127.0.0.1:5173/app/
npm test                    # 71 unit, render and crypto tests
```

See [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) for the full guide,
including running inside Visual Studio, building the Android package, and
publishing to GitHub Pages.

## Support

Qada is free and has no ads, subscription or tracking. If it helped you, you can
leave a tip:

- [Ko-fi](https://ko-fi.com/REPLACE_ME)
- [PayPal](https://paypal.me/REPLACE_ME)

## Roadmap

- Prayer reminders with per-prayer notification actions.
- Home-screen widget with today's prayers and remaining make-ups.
- Encrypted cloud sync between devices (end-to-end, no server-side plaintext).
- Printable make-up plan for review with a scholar.

## Licence

GNU General Public License v3.0 — see [LICENSE](LICENSE).

Qada is a personal tracker, not a fatwa. For your own situation, ask a qualified
scholar.
