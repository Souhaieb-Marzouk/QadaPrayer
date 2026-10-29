# App icon

The repository already ships a finished icon set in `app/assets/`, drawn from
geometry by `tools/make-icons.py`. This document keeps the design brief and the
generation prompt, so the mark can be re-drawn or iterated in any image model
without losing the thinking behind it.

---

## The idea

A **mihrab** — the prayer niche — whose interior holds a **crescent**, wrapped by
an **unfinished progress ring**.

- The arch is the oldest visual shorthand for *a place of prayer*; it reads as
  Islamic instantly without a single letter.
- The crescent is the same shape seen in the sky, and it sits *inside* the niche:
  the prayer is contained by the practice.
- The ring is open, roughly 40 % filled in gold — the remaining debt, being
  worked through. It doubles as a nod to a tasbîh circle.
- Deep emerald night + warm gold: the palette of a lit mosque at Isha, and the
  one combination that stays legible at 48 px on both a bright and a dark home
  screen.

Nothing in the mark is text. That is on purpose: calligraphy at small sizes
turns to mud, and a misread word in a religious app is worse than no word.

---

## Prompt (copy-paste)

```
App icon, 1024×1024, flat vector with very subtle depth, perfectly centred.
A minimalist mihrab arch (two-centred pointed Islamic arch) in warm gold line,
its interior filled with a soft sand glow at low opacity. Inside the arch, a
slender upward-opening crescent fills the niche in warm gold with a gentle
vertical gradient. A thin open circular progress ring encloses the arch, about
40% of its circumference filled in bright gold, the remainder a faint low-opacity
teal, with a small round cap dot at the end of the filled arc.
Background: deep emerald (#0B3D3B) to near-black teal (#04100F) vertical
gradient, with an extremely faint 8-fold Islamic geometric pattern (girih
octagons) at 6% opacity.
Palette: emerald #0B3D3B, teal #12726B, sand #F2E8D5, gold #D4A24C,
light gold #F0CD8A.
Thick, simple silhouettes. Strong contrast. Generous padding: all content inside
the central 66% safe area. Must remain readable at 48×48 px as a single clear
shape.
No text, no letters, no Arabic calligraphy, no numerals, no human figures, no
Quran, no Kaaba, no photorealism, no 3D render, no glossy bevel, no drop shadow
noise, no border frame, no mascot.
```

Negative-prompt list for models that accept one:

```
text, letters, calligraphy, watermark, signature, numbers, mosque photograph,
3D, glossy, bevel, lens flare, clutter, busy ornament, thin hairlines, gradient
mesh, purple, pink, neon
```

### Variants worth generating

1. **Beads** — replace the progress ring with a tasbîh string whose beads are
   filled gold up to 40 %.
2. **Five points** — five vertical gold points inside the arch, forming a rising
   crescent as they gain height.
3. **Negative space** — solid gold square, with the arch cut out as negative
   space and the crescent in the background colour.

---

## Export set

| File | Size | Purpose |
| --- | --- | --- |
| `icon-512.png` | 512×512 | PWA manifest, stores |
| `icon-192.png` | 192×192 | PWA manifest, Android launcher |
| `icon-1024.png` | 1024×1024 | source artwork, App Store |
| `icon-180.png` | 180×180 | iOS home screen |
| `icon-maskable-512.png` | 512×512 | Android adaptive icon (content in 66 % safe area) |
| `favicon.svg` | 64×64 viewBox | browser tab |

Rules of thumb:

- **Maskable** icons are cropped to a circle or squircle by the launcher — keep
  the arch and ring well inside the centre.
- **iOS** icons must be opaque: no transparency, no rounded corners (iOS rounds
  them itself).
- Check the mark at 48 px and at 1024 px before shipping; a shape that works at
  both is a shape that works.

---

## Regenerating

```powershell
python tools/make-icons.py
```

Colours and proportions live at the top of that script. The arch is computed as a
true two-centred pointed arch, so changing the width or the rise keeps the
profile correct instead of bending into a rounded doorway.
