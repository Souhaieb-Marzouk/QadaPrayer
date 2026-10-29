"""Generate the Qada icon set (PWA, iOS, favicon).

Deterministic, no external assets: everything is drawn from geometry so the
mark can be regenerated or tweaked later.

    python tools/make-icons.py
"""

from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "app", "assets")
os.makedirs(OUT, exist_ok=True)

S = 2048  # working size, downscaled for each target


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom):
    image = Image.new("RGB", (size, size), top)
    draw = ImageDraw.Draw(image)
    for y in range(size):
        draw.line([(0, y), (size, y)], fill=lerp(top, bottom, y / (size - 1)))
    return image


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def bezier(p0, p1, p2, steps=48):
    points = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        points.append((x, y))
    return points


def arch_points(cx, base_y, half_width, shoulder_y, apex_y, samples=64):
    """Two-centred pointed arch (the classic mihrab profile)."""
    height = shoulder_y - apex_y
    offset = (height * height - half_width * half_width) / (2 * half_width)
    radius = half_width + offset

    left_edge = []
    for i in range(samples + 1):
        y = shoulder_y - height * i / samples
        dx = math.sqrt(max(0.0, radius * radius - (shoulder_y - y) ** 2))
        left_edge.append((cx + offset - dx, y))

    right_edge = [(2 * cx - x, y) for (x, y) in left_edge][::-1]

    points = [(cx - half_width, base_y)]
    points += left_edge
    points += right_edge[1:]
    points += [(cx + half_width, base_y)]
    return points


def draw_icon(size, maskable=False):
    canvas = vertical_gradient(S, (11, 61, 59), (4, 16, 15)).convert("RGBA")

    # ── faint geometric field ────────────────────────────────────────
    pattern = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(pattern)
    cx = cy = S // 2
    for ring_index, radius in enumerate((760, 640, 520)):
        alpha = 14 if ring_index % 2 == 0 else 9
        pdraw.regular_polygon(
            (cx, cy, radius), n_sides=8, rotation=22.5, outline=(212, 162, 76, alpha), width=6
        )
    pattern = pattern.filter(ImageFilter.GaussianBlur(1.2))
    canvas = Image.alpha_composite(canvas, pattern)

    # ── progress ring ────────────────────────────────────────────────
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    box = [S // 2 - 830, S // 2 - 830, S // 2 + 830, S // 2 + 830]
    rdraw.arc(box, start=0, end=360, fill=(255, 255, 255, 26), width=30)
    rdraw.arc(box, start=-88, end=54, fill=(240, 205, 138, 255), width=30)
    # cap dot
    angle = math.radians(54)
    r = 830
    dot = (S // 2 + r * math.cos(angle), S // 2 + r * math.sin(angle))
    rdraw.ellipse([dot[0] - 26, dot[1] - 26, dot[0] + 26, dot[1] + 26], fill=(240, 205, 138, 255))
    canvas = Image.alpha_composite(canvas, ring)

    # ── mihrab arch ──────────────────────────────────────────────────
    arch = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    adraw = ImageDraw.Draw(arch)
    points = arch_points(cx=S // 2, base_y=1560, half_width=340, shoulder_y=1060, apex_y=560)
    adraw.polygon(points, fill=(242, 232, 213, 26))
    adraw.line(points, fill=(240, 205, 138, 235), width=34, joint="curve")
    canvas = Image.alpha_composite(canvas, arch)

    # ── crescent ─────────────────────────────────────────────────────
    crescent_mask = Image.new("L", (S, S), 0)
    mdraw = ImageDraw.Draw(crescent_mask)
    mdraw.ellipse([S // 2 - 215, 1090 - 215, S // 2 + 215, 1090 + 215], fill=255)
    mdraw.ellipse([S // 2 - 105, 1090 - 270, S // 2 + 325, 1090 + 160], fill=0)

    gold = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gold)
    for y in range(S):
        gdraw.line([(0, y), (S, y)], fill=lerp((240, 205, 138), (196, 138, 55), y / (S - 1)))
    gold.putalpha(crescent_mask)
    canvas = Image.alpha_composite(canvas, gold)

    # ── safe area for maskable icons ─────────────────────────────────
    if maskable:
        inner = canvas.resize((int(S * 0.72), int(S * 0.72)), Image.LANCZOS)
        plate = vertical_gradient(S, (11, 61, 59), (4, 16, 15)).convert("RGBA")
        offset = (S - inner.width) // 2
        plate.alpha_composite(inner, (offset, offset))
        canvas = plate
    else:
        canvas.putalpha(rounded_mask(S, int(S * 0.235)))

    return canvas.resize((size, size), Image.LANCZOS)


TARGETS = [
    ("icon-512.png", 512, False),
    ("icon-192.png", 192, False),
    ("icon-180.png", 180, False),
    ("icon-1024.png", 1024, False),
    ("icon-maskable-512.png", 512, True),
]

for name, size, maskable in TARGETS:
    icon = draw_icon(size, maskable)
    path = os.path.join(OUT, name)
    icon.save(path, "PNG", optimize=True)
    print("wrote", path, f"{os.path.getsize(path) // 1024} kB")

# Favicon: the same geometry, but vector and tiny.
FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b3d3b"/>
      <stop offset="1" stop-color="#04100f"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#g)"/>
  <circle cx="32" cy="32" r="25" fill="none" stroke="#f0cd8a" stroke-opacity=".18" stroke-width="2"/>
  <path d="M32 12a25 25 0 0 1 21.7 12.5" fill="none" stroke="#f0cd8a" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M21 46V32a11 11 0 0 1 22 0v14" fill="none" stroke="#f0cd8a" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M21 46V32a11 11 0 0 1 11-11v25" fill="#f2e8d5" opacity=".1"/>
  <circle cx="32" cy="35" r="6.4" fill="#f0cd8a"/>
  <circle cx="35" cy="33" r="5.4" fill="#0b3d3b"/>
</svg>
"""
with open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8") as handle:
    handle.write(FAVICON)
print("wrote favicon.svg")
