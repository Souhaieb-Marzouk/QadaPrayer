# Testing QadaPrayer

Two audiences in one file: **testers** trying the release for the first time, and
**you** checking the iPhone build without owning one.

---

## For testers — 20 minutes

You need an Android phone. Nothing else.

### 1. Install

1. Open the releases page: <https://github.com/Souhaieb-Marzouk/QadaPrayer/releases/latest>
2. Download the `.apk`.
3. Android will warn about installing from an unknown source — this is normal for
   any app outside a store. Allow it once.
4. Install and open.

### 2. First run

1. The first screen asks **“Do you already use QadaPrayer?”** → choose
   **Start fresh**.
2. Answer the five questions. If you are not sure about the puberty date, pick
   the earliest plausible date — counting a little extra is safer.

### 3. The five checks

Do these in order and note anything odd:

| # | Do this | Expected |
| --- | --- | --- |
| 1 | Today → tap **Subh** → tick “I prayed” → confirm | the ring number drops |
| 2 | Open the same prayer again → untick → Save | the number goes back up |
| 3 | Calendar → **Mark a range** over a past month | those days show as done |
| 4 | Settings → Reminders → on → **Send test** | a notification now, and another after 30 seconds |
| 5 | Settings → Backup → **Download backup** | a toast with the file name, and the file in **Files → Downloads** |

### 4. The one that matters

Close the app completely. Wait for a prayer time you set a reminder for. Does the
notification arrive? **This is the test we cannot run for you.**

### 5. What to send back

- Phone model and Android version
- What you did, what you expected, what happened
- A screenshot if you can

Open an issue: <https://github.com/Souhaieb-Marzouk/QadaPrayer/issues/new?template=bug.yml>

---

## For you — testing the iPhone build without an iPhone

The web app is the iPhone app: same code, installed from Safari. What differs is
what Safari allows.

### Option A — a real device (30 minutes, best)

Borrow any iPhone or iPad (iOS 16.4 or newer).

1. Open Safari (not Chrome — only Safari can add to the home screen).
2. Go to <https://souhaieb-marzouk.github.io/QadaPrayer/app/>
3. Tap **Share** (square with an arrow) → **Add to Home Screen** → **Add**.
4. Open it from the home screen: it should fill the screen with no browser bars.
5. Check, in this order:
   - **The wizard** completes and the data survives closing the app.
   - **Prayer times** match the mosque for your city (±2 minutes).
   - **Marking** works and the ring updates.
   - **Lock**: Settings → App lock, set a PIN, force-quit, reopen → it asks.
   - **Backup**: Settings → Backup → Download. On iPhone this opens the share
     sheet; save to Files, then re-import it.
   - **Reminders**: they will only appear while the app is open. That is an iOS
     limitation, not a bug — write it down as expected.

### Option B — no device at all

Two honest fallbacks:

1. **Safari on macOS** — a Mac exposes the same WebKit engine. It proves layout,
   the wizard, marking, backup, and the service worker, but **not** the
   home-screen install or notifications.
2. **A cloud device farm** — [BrowserStack](https://www.browserstack.com/) and
   [LambdaTest](https://www.lambdatest.com/) both rent real iPhones by the
   minute. The free trials are enough for a 15-minute pass: open the URL in
   Safari, add to home screen, repeat the list above.

### What to record

| Area | Result | Notes |
| --- | --- | --- |
| Add to home screen | | |
| Data survives relaunch | | |
| Prayer times | | |
| Marking | | |
| Lock | | |
| Backup / restore | | |
| Reminders | only while open — expected | |

If everything passes except reminders, that is the expected result: iOS does not
give a home-screen web app background reminders without a push service, and the
app does not use one. Say so plainly in the release notes.

---

## For you — the last hour before 1.0.0

- [ ] Build the APK, publish the release, mark it as **latest** (the in-app
      updater reads `releases/latest`).
- [ ] Install that exact APK on a **second** phone: fresh install → first screen
      → paste a sync code → the ledger arrives.
- [ ] On the second phone, export a backup, wipe the app data, import it, and
      choose **Merge**.
- [ ] Read the guide and the privacy page on a phone, in all three languages.
- [ ] Check the site at the new URL in a browser with an empty cache.
