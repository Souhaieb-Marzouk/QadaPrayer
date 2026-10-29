# The religious model behind Qada

This app is a tracker, not a fatwa. What follows is the reasoning it encodes, so
that you can check it, disagree with it, and adjust the settings accordingly.
For your own situation, ask a qualified Maliki scholar.

---

## What makes a prayer "owed"

A Muslim is obliged to pray five prayers a day from the moment of *boulough*
(legal maturity). Prayers before that moment are not owed and are not part of the
ledger.

The app therefore starts the ledger at **Dhuhr on the day you became
responsible** — not at Subh. The obligation begins with the prayer that opens
the day, so the first day holds four prayers (Dhuhr, Asr, Maghreb, Isha) and
every following day holds five. The engine encodes this as an offset rather than
a special case, which is why totals are `days × 5 − 1`.

---

## When does boulough happen?

Legal maturity is established by a sign, not by a birthday:

- for boys: *ihtilâm* (a wet dream), or the growth of coarse pubic hair, or
  reaching the age at which maturity is presumed;
- for girls: menstruation, pregnancy, or the same signs;
- and, in the absence of any sign, by age — the Maliki school is commonly cited
  at **18 lunar years**, with other positions at 15 or 17.

The app cannot detect any of this, so it asks. Two modes exist:

- **"I know the date"** — you already know when it happened.
- **"I am not sure"** — the app proposes a conservative estimate (14 for boys,
  12 for girls by default).

### Why the estimate errs early

If you guess too late, you silently drop prayers you actually owe. If you guess
too early, you count a few prayers you may not have owed — and praying them is
not harmful. The app therefore explains, in the setup wizard, that the earlier
date is the safer mistake, and lets you move the date later at any time without
losing a single recorded prayer. That is possible because the ledger is indexed
to absolute slots, so moving the start boundary does not shift anything.

---

## When a prayer becomes a *qadâ'*

A prayer is due during its window. If the window closes without the prayer being
performed, it becomes a missed prayer that must be made up.

The windows the app uses:

| Prayer | Opens | Closes |
| --- | --- | --- |
| Subh | Subh | sunrise |
| Dhuhr | solar noon + 1 min | Asr |
| Asr | shadow = 1× object (+ noon shadow) | Maghreb |
| Maghreb | sunset | Isha |
| Isha | Isha | next Subh |

The Asr rule is the standard (Maliki/Shâfi'î/Jumhûr) one: the shadow of an
object equals its own length plus the shadow at noon. A Hanafi option (×2) is
available in settings for people who follow it.

Isha's window ends at the next Subh, so a night prayer performed before Fajr
still belongs to the previous day. The app assigns Isha to the civil date of its
opening time.

---

## Order (tartîb)

Classical Maliki teaching requires missed prayers to be made up **in order**, and
to be interleaved with the current prayers rather than postponed indefinitely.
When the number of missed prayers becomes very large, the obligation of strict
order is widely held to be lifted, because it would make the current prayers
impossible to perform on time.

Qada's default behaviour — a continuous chronological stream folded into today's
five prayers — is therefore both a legal convenience and a motivational device.
It is **not** a condition for validity. If you make up a specific prayer out of
order, the ledger simply records it; nothing breaks.

The app says this in the confirmation sheet when more than one make-up is
attached to a prayer.

---

## Exemptions

Some days carry no obligation, or fewer prayers:

- **Menstruation and post-natal bleeding** — prayer is not owed and is not made
  up afterwards. The app lets those days be marked *exempt*, which removes them
  from what you owe and from the total.
- **Illness or unconsciousness** — depends on the case; if prayer was not due,
  mark the day exempt.
- **Before Islam** — a person who embraced Islam later owes nothing from before
  that date. Set *Islam since* and the ledger starts there instead of at
  puberty.

Exempt days are excluded from the denominator as well as the numerator, so the
completion percentage stays honest.

---

## What the app deliberately does not do

- It does not judge whether a prayer was valid (purity, qibla, intention,
  congregation). It records that you say you prayed it.
- It does not compute *fidya* (compensation for prayers that can never be made
  up). The Maliki position this app follows is that the able person makes them
  up.
- It does not shorten prayers for travel. The count is of prayers, not rak'as,
  so travelling does not change how many you owe.
- It does not decide your puberty date, your exemptions, or your intention. It
  only counts.

---

## A note on scrupulousness

If you find yourself doubting every entry, remember the principle that hardship
is not the purpose. The app is built so that the honest, approximate answer is
always available: mark the ranges you are sure about, leave the rest, and let the
number be a companion rather than an accuser.
