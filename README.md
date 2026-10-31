# Qada

A private, offline tracker for the prayers you still owe — and a calm way to
make them up.

Qada counts every prayer from the day your obligation began until today, then
folds a small, steady number of make-ups into the five prayers you are praying
today. It is built on the Maliki position that missed prayers must be made up.

**[Website](https://souhaieb-marzouk.github.io/Qada-App/)** ·
**[Open the app](https://souhaieb-marzouk.github.io/Qada-App/app/)** ·
**[Releases](https://github.com/Souhaieb-Marzouk/Qada-App/releases)** ·
**[Local setup](docs/LOCAL-DEVELOPMENT.md)** ·
**[How it works](docs/ARCHITECTURE.md)**

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
- **Reminders** — a notification at each prayer and one evening nudge with the
  make-ups still waiting, with a lead time, quiet hours, chime and vibration.
- **Mark from the notification** — on Android, “I prayed” records the prayer
  without opening the app.
- **Hijri date** — the Umm al-Qura date under today’s header, in your language.
- **Exports** — the whole ledger as CSV, and a printable plan of the make-ups
  still owed.
- **Momentum** — a daily streak, the best one you have had, and this week's and
  this month's completion at a glance.
- **“I prayed extra”** — recorded a batch of make-ups in one tap; it comes off
  the oldest ones you still owe.
- **Progress you can feel** — remaining count, completion, projected finish
  date, seven-day activity and milestones.
- **Private by construction** — no account, no server, no analytics. Backups are
  files you own, optionally encrypted with a passphrase.
- **Arabic, English and French**, with full RTL layout, light/dark themes and a
  text-size setting.

## Install

- **Android** — download the latest `.apk` from
  [releases](https://github.com/Souhaieb-Marzouk/Qada-App/releases/latest) and
  open it, or add this repository to
  [Obtainium](https://obtainium.imranr.dev/) for automatic updates.
- **iPhone / iPad** — open the app in Safari, tap *Share* → *Add to Home Screen*.
- **Desktop** — open the app in any modern browser.

Detailed steps: [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md).

> Installed copies check for a new version on launch, when the app comes back to
> the foreground and every 30 minutes, and offer a one-tap reload when one is
> ready.

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

- **Home-screen widget** — the web side and the native add-on are ready in
  `android/widget/`; it needs one APK rebuild and is not part of the current
  release.
- Encrypted cloud sync between devices (end-to-end, no server-side plaintext).
- Profiles for more than one person on the same phone.

## Licence

GNU General Public License v3.0 — see [LICENSE](LICENSE).

Qada is a personal tracker, not a fatwa. For your own situation, ask a qualified
scholar.
