# Architecture

A short document for whoever maintains this next — including future me.

---

## The one idea

> Every prayer of a lifetime is a numbered slot. The app stores one mark per
> slot. Everything on screen is derived from those marks.

There is no stored "plan", no stored "current position", no stored "next
make-up". This is the whole reason that changing your daily pace, marking an
old week months later, or deferring a make-up can never corrupt history.

---

## Slot numbering

```
slotIndex = dayNumber * 5 + prayerIndex

prayerIndex   0 Subh · 1 Dhuhr · 2 Asr · 3 Maghreb · 4 Isha
dayNumber     days since 1970-01-01 (UTC, proleptic Gregorian)
```

Because the numbering is anchored to 1970 rather than to the profile, editing
your puberty date later — a routine event, since most people start with an
estimate — **moves a boundary and shifts nothing else**. Marks keep their
absolute positions.

The first obliged slot is `Dhuhr` of the puberty day, not Subh: the obligation
begins with the prayer that opens the day, which is why the very first day of
the ledger holds four prayers rather than five.

```
owedStart = dayNumber(pubertyDate) * 5 + 1
```

If a `revertDate` is set, the start moves to `max(owedStart, revertDate * 5)`.

---

## Marks

One byte per slot:

| value | meaning |
| --- | --- |
| `0` | owed, not yet made up |
| `1` | done |
| `2` | exempt (not owed at all) |

Stored as run-length-encoded pairs `[value, length]`, which keeps a forty-year
backlog in a couple of kilobytes: almost every run is long and uniform.

`QadaPrayer.toJSON()` is the only serialisation format. Backups, undo snapshots, the
local store and the future sync layer all use it unchanged.

---

## The backlog

```
backlog = slots in [owedStart, endOf(yesterday)] with mark != exempt
```

Today's five prayers are **not** part of the backlog: they are the current
obligation. Tomorrow, whatever today left unmarked becomes part of it, at the
tail, because the queue is chronological.

That single rule replaces a lot of bookkeeping: there is no "today becomes
yesterday" migration, no rollover job, no special case for "you missed Subh this
morning".

---

## The daily plan

`QadaPrayer.plan(dateISO)` is a pure function of `(marks, profile, date)`:

1. `quota` = make-ups per day (a multiple of five by default).
2. `capacities` = quota split across the five prayers, earliest first
   (`10 → [2,2,2,2,2]`, `7 → [2,2,1,1,1]`).
3. A prayer that is **already marked done today** has capacity `0`: its make-ups
   were settled when the user confirmed it.
4. A prayer whose make-up list is **suppressed** has capacity `0` (see deferral).
5. Walk the backlog from the head, take `sum(capacities)` undone slots in
   chronological order, and hand them out in order.

Nothing is consumed until the user actually confirms. Re-rendering, reloading,
sleeping, or changing the pace simply recomputes the same assignment.

### Why the interleaving looks "cascaded"

The make-ups form one continuous stream, and today's prayers are five buckets
filled in order. With two days of make-ups per day:

```
Subh     ← Dhuhr 01/01, Asr 01/01
Dhuhr    ← Maghreb 01/01, Isha 01/01
Asr      ← Subh 02/01, Dhuhr 02/01
Maghreb  ← Asr 02/01, Maghreb 02/01
Isha     ← Isha 02/01, Subh 03/01
```

The stream crosses midnight, which is why Isha can carry tomorrow's Subh. That
is the intended behaviour, and it is asserted by a test.

---

## Deferral

When the user says "I did not pray Asr", the make-ups that were offered for Asr
are still undone and still at the head of the queue. Two outcomes are offered:

**Under the next prayer.** The current prayer is suppressed. The next prayer
takes the leftover make-ups, and the rest of the day shifts by one slot. Total
work stays the same; part of it moves to tomorrow only if the day runs out.

**To tomorrow.** The current prayer *and every prayer after it today* are
suppressed. Nothing more happens today; tomorrow resumes at the same place in
the queue.

Both are stored as a bitmask per date:

```js
pauses: { '2026-10-29': 0b00100 }
// bit i set  →  prayer i has no make-up list that day
```

The mask is a presentation override, not a data change: no mark is altered, and
`clearPause` restores the plan exactly.

`prayed: false` also leaves the current prayer unmarked, so it enters the
backlog tomorrow at the tail. That is the honest outcome — the user told us it
was not prayed.

---

## Frequency changes

`profile.quotaPrayers` is a single number applied to *today and the future*.
Because the past is never stored as a plan, lowering it cannot alter anything
already marked. The test **"changing the frequency keeps every past mark
intact"** simulates two weeks at 2 days/day, switches to 1 day/day, and asserts:

- the done count is unchanged,
- the ledger bytes are unchanged,
- the next make-up is exactly the one after the last consumed slot.

---

## Reminders

Two modules, split exactly along the testability line:

- `core/reminders.js` — pure. Given today's and tomorrow's prayer windows, the
  current minute, the settings and the remaining count, it returns an ordered
  queue of `{ key, kind, atMinutes, delayMinutes }`. Quiet hours (which may wrap
  midnight), lead times, disabled prayers and the evening nudge are all decided
  here, so they can be proven without a browser.
- `notify.js` — delivery. It owns permission, the notification call
  (`ServiceWorkerRegistration.showNotification` with a `Notification`
  fallback), the chime (WebAudio, primed on a user gesture), vibration, and a
  single timer armed for the head of the queue. When it fires, the event is
  remembered in a `Set` (so a reminder can never show twice for the same key)
  and the queue is re-armed.

The queue is rebuilt on boot, every 30 seconds, when the app becomes visible,
and after every commit — so changing the location, the method or the pace is
reflected immediately. Midnight resets the "already shown" memory.

Known limits, stated in the UI rather than hidden: a web app can only deliver a
reminder while it is alive, and browsers throttle background timers. Installing
to the home screen improves delivery substantially on Android; on iOS it works
while the app is open or recently backgrounded.

Where the platform supports notification actions (Android/Chrome), the reminder
carries an **I prayed** button. The service worker never touches the ledger
itself — it cannot, the state lives in `localStorage`. Instead it posts a
`MARK_PRAYED` message to an open window, or opens the app with `?mark=<date>:<prayer>`
when none is open. Both paths end in `markFromNotification()`, which calls the
same `applyOutcome()` used by the confirmation sheet: one code path, no special
cases, and the same undo.

---

## Exports

`js/exporter.js` holds two pure functions and no DOM:

- `ledgerCsv` — one row per owed prayer (`date,prayer,status`), the raw record.
- `summaryByYear` — totals per Gregorian year, used by the printable plan.

`js/ui/print.js` renders those totals as a plain page (no app chrome, own light
palette under `@media print`) so it can be printed or shown to a scholar. The
route `#/print` hides the bottom navigation.

Both are covered by Node tests, which is why the CSV format is asserted row by
row rather than eyeballed.

---

## Persistence

`Store` (app/js/store.js) is the only module that touches storage.

- `localStorage` key `qada.state.v1`, debounced 180 ms, with an in-memory
  fallback when storage is blocked.
- `qada.meta.v1` holds non-model preferences (last backup date, language).
- Undo keeps the last 12 serialised snapshots in memory only.
- Backups are JSON envelopes:
  - plain — `{ app: "qada", kind: "backup", data: {...} }`
  - encrypted — PBKDF2-SHA256 (310 000 iterations) → AES-GCM-256, with a random
    salt and IV per export. The passphrase never leaves the device.
- The PIN is stored as PBKDF2 output plus salt, compared in constant time.

Nothing else is persisted, and no module performs network I/O at runtime.

---

## Rendering

`render()` rebuilds a template string and assigns it to `#app`. One delegated
click/change/input listener on `document` dispatches to flat handler maps
(`data-action`, `data-change`, `data-live`).

At this size — five screens, a handful of sheets, a few hundred nodes — a full
re-render is faster than diffing and removes the entire class of "the view and
the model disagree" bugs. Screen modules are pure functions of `app`, which is
also why they can be unit-tested in Node.

`data-live` handlers deliberately do **not** re-render: they mutate state and
patch the specific label, so typing in a search box or dragging the pace slider
does not lose focus.

---

## Time

All prayer times are derived from:

- the civil date in the **location's** timezone,
- the coordinates,
- the calculation method, Asr shadow and per-prayer offsets.

The solar solver iterates the sun's declination at the moment of each event
rather than at noon, which is what keeps it within a minute of published
timetables at high latitudes. Times are rounded **up** so a window never opens
before the astronomical truth.

Historical DST comes from the platform's `Intl` timezone database, not from a
bundled table — so a 2005 Tunisian summer is correctly UTC+2 while 2026 is UTC+1,
without shipping tzdata.

Only "today" needs real timestamps; the backlog only needs dates. That is why
opening a twenty-year ledger is instant.

---

## Invariants the tests protect

1. `sum(make-ups shown today) + remaining after today = remaining before today`
   — nothing is created or lost by rendering.
2. No make-up appears twice in the same plan.
3. Confirming a full day advances the queue by exactly the day's quota.
4. Past marks are byte-identical after a pace change.
5. `toJSON → fromJSON` is lossless, and stays under ~120 kB for a 20-year
   history.
6. Every screen renders in all three languages without `undefined`/`NaN` leaking
   into the markup, and with balanced tags.
7. Boot works from nothing (onboarding) and from a saved model.

---

## Security posture

- No network permission is used at runtime; the app is a static bundle.
- No third-party JavaScript. The whole dependency tree is this repository.
- User text is escaped at every interpolation (`esc()`).
- Backups are encrypted client-side; there is no server to breach.
- The PIN is a local convenience lock, not a cryptographic boundary — it is
  documented as such in the UI.
- The service worker caches only same-origin GET responses.

Obvious non-goals: defending against a compromised device, or against someone
with the unlocked phone and devtools. Both are outside a local-only app's threat
model.
