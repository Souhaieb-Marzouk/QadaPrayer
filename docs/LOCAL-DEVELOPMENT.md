# Local development guide

Everything in this project is plain HTML, CSS and JavaScript — there is no build
step and no package to install. That is deliberate: the app must keep working
for years without a toolchain that rots.

---

## 1. What you need

| Tool | Needed for | Notes |
| --- | --- | --- |
| **Node.js 20+** | dev server, tests, icon/screenshot scripts | Node 24 is what it was built with |
| **A modern browser** | running the app | Edge, Chrome, Firefox or Safari 16.4+ |
| **Visual Studio 2026** *(optional)* | editing files | Any editor works; VS is not required to run the app |
| **Python 3 + Pillow** *(optional)* | regenerating the icon PNGs | `pip install pillow` |
| **JDK 17 + Android SDK** *(optional)* | building an `.apk` locally | see section 9 |

Nothing else. `node_modules` does not exist and never will.

---

## 2. Get the files

Clone the repository, or unzip it somewhere without spaces in the path:

```
C:\dev\qada
```

---

## 3. Open the project in Visual Studio 2026

Visual Studio does not run JavaScript web apps, but it is a perfectly good
editor for this repository, and its terminal is all you need.

1. **File → Open → Folder…** and pick the `qada` folder.
   *(In VS 2026 this creates a lightweight "Open Folder" workspace.)*
2. If you are asked to add a project or a `.sln`, choose **no** — this is a
   static site, not a .NET solution.
3. Open **View → Terminal** (or `Ctrl+~`). All commands below run there.
4. Optionally pin `app/js/main.js`, `app/css/app.css` and `package.json` to the
   tab bar; those three files are where 90% of the work happens.

> **Visual Studio Code is a better fit** if you want JavaScript IntelliSense and
> live reload. Open the same folder and install nothing — the language support
> is built in. VS 2026 remains fine for editing and running the terminal.

---

## 4. Start the app

From the repository root:

```powershell
node tools/serve.mjs
```

You will see:

```
Qada dev server → http://127.0.0.1:5173/
App            → http://127.0.0.1:5173/app/
Demo           → http://127.0.0.1:5173/app/?demo=1
```

Open **http://127.0.0.1:5173/app/** in your browser.

On first launch you get the setup wizard: language, gender, puberty date,
whether you already pray regularly, city, and daily pace. It takes about a
minute, and it writes only to your browser's local storage.

**Reset to a clean slate** at any time: DevTools (`F12`) → *Application* →
*Local Storage* → right-click → *Clear*, then reload. Or open the app with
`?fresh=1` and clear storage; the wizard reappears when no profile exists.

---

## 5. Demo mode

`http://127.0.0.1:5173/app/?demo=1` loads a realistic dataset (puberty 2004,
two years already made up, praying regularly since 2018) **in memory only** —
nothing is saved. It is the fastest way to look at a populated interface, and it
is what the landing page embeds in its phone frame.

The app also accepts a few URL parameters used by the screenshot tooling:

```
?demo=1&lang=ar              Arabic / RTL
?demo=1&lang=fr&theme=light  French, light theme
?demo=1&route=stats          open a screen directly
?demo=1&sheet=prayer:asr     open a bottom sheet directly
?demo=1&route=calendar&calmonth=3&year=2010
?onb=6                       a specific onboarding step
```

---

## 6. Run the tests

```powershell
npm test
```

or, without npm:

```powershell
node --test --test-isolation=none "tests/*.test.js"
```

71 tests cover the calendar maths, the solar calculations (checked against a
published timetable for Tunis), the qada planner, persistence, and every screen
in all three languages.

> `--test-isolation=none` is required on some sandboxed machines where Node
> cannot spawn the per-file worker processes. It runs everything in one process.

---

## 7. Test on your phone over Wi-Fi

```powershell
node tools/serve.mjs 5173 . 0.0.0.0
```

Then open `http://<your-pc-ip>:5173/app/` on the phone. Find the IP with
`ipconfig` (look for *IPv4 Address*).

Two caveats:

- Android will show the app fine, but **offline mode and installation are
  disabled** over plain HTTP — service workers require `https://` or
  `localhost`. To test the installed experience, deploy to GitHub Pages
  (section 10) or use a tunnel.
- The phone must be on the same network and Windows Firewall must allow Node.

---

## 8. Where things live

```
app/                 the application (what gets installed)
  index.html         shell
  css/app.css        design system
  js/main.js         boot, routing, rendering, events
  js/core/           pure logic: dates, astronomy, prayer times, qada engine
  js/ui/             screens and sheets
  js/i18n.js         English / French / Arabic strings
  js/store.js        persistence, undo, encrypted backups, PIN
  data/cities.js     offline city list
  sw.js              service worker (offline shell)
tests/               Node test suites
tools/               dev server, icon generator, screenshot runner
docs/                this guide and the design notes
index.html, site.css landing page
```

---

## 9. Build an Android package

The app is installable from the browser without any packaging (see the landing
page). If you want a real `.apk` to attach to a GitHub release, you have three
routes.

### a) PWABuilder — no local toolchain (recommended first time)

1. Deploy the site (section 10) so it has a public HTTPS URL.
2. Go to <https://www.pwabuilder.com/>, paste the URL, choose **Android**.
3. Download the generated package. It contains a signed `.apk` and an `.aab`,
   plus the signing key it generated — **keep that key file**, you need the same
   key to ship updates.

### b) Bubblewrap — a thin native wrapper, reproducible

Requires JDK 17 and the Android SDK.

```powershell
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<your-site>/app/manifest.webmanifest
bubblewrap build
```

### c) Capacitor — if you later want native plugins

```powershell
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init Qada app.qada.tracker --web-dir=app
npx cap add android
npx cap sync
```

Then `android/` can be opened in Android Studio and built.

Whichever route you take, **back up the signing keystore and its password**. If
you lose them you can never update the app under the same identity.

---

## 10. Publish the site (GitHub Pages)

This repository is already wired for it:

- **Website** — <https://souhaieb-marzouk.github.io/Qada-App/>
- **App** — <https://souhaieb-marzouk.github.io/Qada-App/app/>
- **Repository** — <https://github.com/Souhaieb-Marzouk/Qada-App>

1. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder
   `/ (root)`. Save.
2. After a minute the site is live at the URLs above.
3. The only remaining placeholders are the tip links: `app/js/config.js`,
   `index.html` and `README.md` (`ko-fi.com/REPLACE_ME`,
   `paypal.me/REPLACE_ME`). Everything else already points at the real
   repository and website.
4. Bump `VERSION` in `app/js/config.js` and the cache name in `app/sw.js`
   (`qada-v2` → `qada-v3`) whenever you ship. The service worker only replaces
   its cache when that name changes — and installed copies use it to detect the
   new version.

Custom domain: add a `CNAME` file with your domain and point a DNS `CNAME`
record at `souhaieb-marzouk.github.io`.

---

## 11. Regenerate the icons

```powershell
python tools/make-icons.py
```

Writes `icon-192`, `icon-512`, `icon-1024`, `icon-180` (iOS),
`icon-maskable-512` and `favicon.svg` into `app/assets/`. The mark is drawn from
geometry in `tools/make-icons.py`, so tweaking colours or proportions is a
two-line change.

---

## 12. Regenerate screenshots

```powershell
powershell -ExecutionPolicy Bypass -File tools/shots.ps1
```

With the dev server running, this drives headless Edge/Chrome over a set of
deep-linked URLs and writes PNGs into `screenshots/`. It also verifies that the
app shell renders at all.

> Headless Chromium needs to create its own profile and cache directories. Some
> heavily sandboxed environments block that; run it from a normal terminal.

The landing page does **not** depend on these files: it shows the real screens as
live, non-interactive iframes, so the site can never drift from the app. The PNGs
are for the store listing, the README and social previews.

---

## 13. Troubleshooting

**I changed the CSS and nothing happened.**
Hard reload (`Ctrl+Shift+R`). If the service worker is registered, also
DevTools → *Application* → *Service Workers* → *Unregister*.

**"Your browser is blocking local storage."**
Private/incognito windows and some enterprise policies block it. Use a normal
window; the app cannot save anything without storage.

**The prayer times look a few minutes off my mosque.**
Open Settings → *Fine tuning* and set a per-prayer offset. Every mosque rounds
slightly differently; that setting exists exactly for this.

**Tests fail with `EPERM` or `spawn` errors.**
Run them with `--test-isolation=none` as shown above.

**Nothing renders / blank page.**
Open the browser console. The app fails loudly rather than silently; a single
error is usually a typo in a template string.
