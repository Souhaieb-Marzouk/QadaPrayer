# QadaPrayer

**Count the prayers you owe, and make them up — one at a time.**

QadaPrayer counts every prayer from the day your obligation began until today,
then folds a small, steady number of make-ups into the five prayers you are
praying today. Free, open source, no account, no ads.

**Website:** <https://souhaieb-marzouk.github.io/QadaPrayer/>
**User guide:** [English](https://souhaieb-marzouk.github.io/QadaPrayer/guide.html) ·
[Français](https://souhaieb-marzouk.github.io/QadaPrayer/guide-fr.html) ·
[العربية](https://souhaieb-marzouk.github.io/QadaPrayer/guide-ar.html)

---

## Install

### Android

1. Open the [releases page](https://github.com/Souhaieb-Marzouk/QadaPrayer/releases/latest).
2. Download the `.apk` and install it — Android asks once to allow installs from
   this source, which is normal for anything outside a store.
3. Open it. From then on the app can update itself from Settings → About.

### iPhone and iPad

1. Open the [app](https://souhaieb-marzouk.github.io/QadaPrayer/app/) in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. It opens full screen and works offline.

> Reminders on iPhone appear only while the app is open: iOS gives a
> home-screen web app no background reminders without a push service, and this
> app does not use one. Android gets real system alarms.

---

## What it does

- **A lifetime ledger** — every prayer, from puberty to today, has a place.
  Mark whole days, months or years in one go.
- **Make-ups woven into today** — under each of the five prayers, the make-ups
  that belong to it, with their exact dates.
- **Change your pace, keep your history** — lowering the daily pace never
  rewrites a prayer you already made up.
- **Correct anything** — un-tick a prayer, or a single make-up out of a batch,
  and the calendar follows.
- **Prayer times on the device** — calculation method, Asr shadow and per-prayer
  offsets, computed on the phone, with no network.
- **Reminders** — lead time, quiet hours, a sound, and an “I prayed” action on
  Android (a tap-to-confirm elsewhere).
- **Momentum** — a streak, this week and this month, plus a review page with the
  last 28 days, the best and weakest day, and the last four weeks.
- **Several people, one phone** — each profile has its own ledger, its own
  settings and its own sync code.
- **Backups and sync** — encrypted files you own, and an optional end-to-end
  encrypted sync with a server you configure yourself.
- **Arabic, English, Français** — full right-to-left support.
- **Dark, light, sepia, midnight**, Arabic digits, and a qibla compass.

---

## Privacy

Your ledger lives in your browser, on your phone. No account, no analytics, no
server of ours. → **[Privacy note](https://souhaieb-marzouk.github.io/QadaPrayer/privacy.html)**

---

## Support

QadaPrayer is free and collects nothing — there is no ad slot to sell. If it
earned a place in your day, a tip keeps the updates coming. A duʿāʾ counts too.

- ☕ [Ko-fi](https://ko-fi.com/cyberpulseacademy)
- 💳 [PayPal](https://www.paypal.com/donate/?hosted_button_id=KNUSPQTVR9WCU)

---

## For developers

A zero-dependency, offline-first PWA: no build step, ES modules served directly.
The Android shell is a MAUI WebView wrapper with native reminders, a home-screen
widget and in-app updates.

```bash
npm test          # 210 tests, nothing to install
npm run serve     # local dev server
npm run package   # deterministic web bundle
```

| Document | What is in it |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | how the plan, storage and sync fit together |
| [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) | running it on a PC |
| [docs/RELEASING.md](docs/RELEASING.md) | the one-command release |
| [docs/TESTING.md](docs/TESTING.md) | what to test on a device — and how to test iPhone without one |
| [docs/FIQH.md](docs/FIQH.md) | the positions the app follows |
| [android/README.md](android/README.md) | building the APK, reminders, widget, updates |
| [infra/README.md](infra/README.md) | deploying the sync worker |

---

## Licence

GNU General Public License v3.0 — see [LICENSE](LICENSE).

QadaPrayer is a personal tracker, not a fatwa. For your own situation, ask a
qualified scholar.
