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

1. `npm test` — all green.
2. Update `VERSION` (`app/js/config.js` and `package.json`) and the
   service-worker cache name in `app/sw.js` (`qada-v2` → `qada-v3`).
3. `npm run package` — writes `dist/qada-<version>-web.zip` and its `.sha256`.
4. Build the Android package if this release ships one (see below).
5. Create the GitHub release:
   - **Tag:** `v0.2.0`
   - **Title:** `Qada 0.2.0 — <short human phrase>`
   - **Body:** the description below.
6. Attach the assets produced in step 3 (and the `.apk` from step 4).
7. Verify the landing page download link resolves to the new release.

---

## Release assets

`npm run package` produces a deterministic archive — the same sources always
yield the same bytes, so the checksum is meaningful:

| File | What it is |
| --- | --- |
| `qada-<version>-web.zip` | deployable copy of the site and app (`index.html`, `site.css`, `app/`, `LICENSE`) |
| `qada-<version>-web.zip.sha256` | SHA-256 of the archive, for a download check |

Attach both to the release. The zip is also what you would hand to anyone who
wants to self-host.

### The Android `.apk`

An APK cannot be produced from this repository alone — it needs the Android
toolchain (or a signing service). The full walkthrough lives in
[`android/README.md`](../android/README.md); in short:

**Visual Studio + .NET MAUI.** Install the *.NET Multi-platform App UI
development* workload, create a MAUI project named `Qada`, drop in the two files
from `android/overrides/`, set the package id and version, then **Publish →
Archive → Distribute → Ad Hoc** — Visual Studio creates the keystore and the
signed `.apk`; **Distribute → Google Play** produces the `.aab`.

**PWABuilder (no install, ~3 minutes).** Deploy the site first, then go to
<https://www.pwabuilder.com/>, paste
`https://souhaieb-marzouk.github.io/Qada-App/app/`, choose Android and download
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
Qada 0.1.0 — First release
Qada 0.2.0 — Reminders
Qada 0.3.0 — Home-screen widget
Qada 1.0.0 — Stable
```

The phrase names the thing the release is *about*, not a mood.

---

## What belongs in a release

- A tested, working app.
- One clear idea, or a small set of related fixes.
- Notes a user can act on.

What does not: half-finished screens, assets that were never used, or a version
bump on its own.
