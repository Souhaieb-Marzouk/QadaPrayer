# Releasing and committing

Conventions so that every change and every release can be described the same
way, months from now, without having to reconstruct the story.

---

## Commits

One commit per coherent change. Subject in the imperative, ≤ 72 characters,
prefixed with a type:

```
feat(plan): interleave make-ups across the five prayers
fix(calendar): keep the year view inside the puberty bounds
perf(engine): skip exempt runs when building the plan
docs(setup): add the Android build options
test(engine): cover a mid-stream pace change
chore(release): bump to 0.2.0
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `style`, `chore`.

The body explains **why**, not what — the diff already says what:

```
feat(plan): interleave make-ups across the five prayers

A single flat queue consumed in order keeps the assignment derivable, so
changing the daily pace cannot rewrite history. Today's prayers are buckets
filled in sequence, which also gives the cascade the spec asks for.
```

`.gitmessage`-style checklist before pushing:

- [ ] `npm test` is green
- [ ] new behaviour has a test
- [ ] strings added to **all three** languages in `app/js/i18n.js`
- [ ] `app/sw.js` cache name bumped if shipped assets changed
- [ ] `VERSION` in `app/js/config.js` bumped for a release

---

## Versions

`MAJOR.MINOR.PATCH`, starting at `0.1.0` while the shape of the product is still
settling.

| Change | Bump |
| --- | --- |
| Bug fix, copy change, icon tweak | `PATCH` |
| New screen, new setting, new behaviour | `MINOR` |
| Data format changes and needs a migration | `MAJOR` |

The app version lives in `app/js/config.js` (`VERSION`). The offline cache
version lives in `app/sw.js` (`qada-vN`). Bump both when releasing.

---

## Release checklist

One command builds everything. The rest is GitHub's UI.

### 1. Build

```powershell
# first time: tell it where the MAUI project lives (remembered afterwards)
.\tools\release.ps1 -Version 0.2.1 -ProjectDir C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer

# every release after that
.\tools\release.ps1 -Version 0.2.2
```

It does **all** of the following, in order, and stops on the first problem:

1. bumps the version in `package.json`, `app/js/config.js`, the service worker
   cache name (`qada-v2` → `qada-v3`, what makes installed copies notice the
   update) and `QadaPrayer.csproj` (`ApplicationDisplayVersion` +
   `ApplicationVersion` = `MAJOR*10000 + MINOR*100 + PATCH`);
2. checks that the three JavaScript versions agree;
3. runs the test suite;
4. builds `dist/qada-<version>-web.zip`;
5. publishes the signed APK and copies it to `dist/qada-<version>.apk`;
6. writes the `.sha256` files and `dist/SHA256SUMS.txt`.

If no password is supplied the script **asks for it** (hidden input, kept in
memory only — nothing is written to disk). For unattended runs, pass
`-StorePass` or set `$env:QADA_STORE_PASS` for that terminal:

```powershell
$env:QADA_STORE_PASS = 'your keystore password'
```

`.NET` reads it through `env:`, so characters like `$`, `&`, `!` or `"` are safe.

Add `-SkipApk` to build only the web bundle, `-SkipTests` to skip the suite.

Output in `dist/`:

| File | What it is |
| --- | --- |
| `qada-<version>-web.zip` | deployable copy of the site and app (`index.html`, `site.css`, `app/`, `LICENSE`) |
| `qada-<version>-web.zip.sha256` | SHA-256 of the archive |
| `qada-<version>.apk` | the signed Android package |
| `qada-<version>.apk.sha256` | SHA-256 of the APK |
| `SHA256SUMS.txt` | both hashes in one file |

### 2. Publish

1. Commit and push the version bump.
2. **Releases → Draft a new release**
   - **Tag:** `v0.2.1`
   - **Title:** `QadaPrayer 0.2.1 — <short human phrase>`
   - **Body:** the description below.
3. Drag the four files from `dist/` into the release. (`SHA256SUMS.txt` is
   optional but nice.)
4. Publish.

### 4. Verify

- The landing page's download link resolves to the new release.
- The site still loads: <https://souhaieb-marzouk.github.io/QadaPrayer/app/>
- On a phone with the previous version installed: open the app, wait a moment,
  and it should offer **Reload** for the new version.

---

## Release assets

The web archive is deterministic — the same sources always yield the same bytes,
so the checksum is meaningful.

### The Android `.apk`

Only APKs are shipped for now; the `.aab` is for the Play Store and can wait
until the app is stable. The full walkthrough of the MAUI project lives in
[`android/README.md`](../android/README.md); in short:

**Visual Studio + .NET MAUI.** Install the *.NET Multi-platform App UI
development* workload, create a MAUI project named `QadaPrayer`, drop in the two
files from `android/overrides/`, set the package id and version, then publish
with `dotnet publish` — there is no Archive Manager in MAUI.

**PWABuilder (no install, ~3 minutes).** Deploy the site first, then go to
<https://www.pwabuilder.com/>, paste
`https://souhaieb-marzouk.github.io/QadaPrayer/app/`, choose Android and download
the package. It contains a signed `.apk`, an `.aab`, and the signing key it
generated — **keep that key**, updates need it.

Whichever route you take, name the result `qada-<version>.apk` so the link in
`index.html` keeps working, and **never commit the keystore**.

---

## Release description template

```markdown
## What's new

- **<Feature>** — one sentence on what the user can now do.

## Fixed

- One sentence per fix, phrased from the user's point of view.

## Under the hood

- Only what a contributor would care about. Skip if empty.

## Updating

Android: download `qada-0.2.0.apk` below and install it over the previous
version — your data is kept. iPhone: open the app in Safari; it updates itself.

## Data

No changes to the save format. Backups made with 0.1.x restore normally.
```

Keep it short, factual, and free of marketing. The same rule as the README.

---

## Release naming

```
QadaPrayer 0.1.0 — First release
QadaPrayer 0.2.0 — Reminders
QadaPrayer 0.3.0 — Home-screen widget
QadaPrayer 1.0.0 — Stable
```

The phrase names the thing the release is *about*, not a mood.

---

## What belongs in a release

- A tested, working app.
- One clear idea, or a small set of related fixes.
- Notes a user can act on.

What does not: half-finished screens, assets that were never used, or a version
bump on its own.
