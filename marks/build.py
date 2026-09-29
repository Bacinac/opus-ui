#!/usr/bin/env python3
"""Derive every OPUS mark from the accepted family sheet.

Source of the geometry: complete-app-family-overview-set-18.svg (kept with the
family's proposals in the DIDA repository, brand/proposals/). The glyph paths,
the signature cut, the tile, the O's place on it and the three module lockups
are copied from that sheet verbatim — nothing is redrawn here, and nothing this
script writes is ever edited by hand.

Downloads, Library and Player share one O for the tab and the home screen; only
the full lockup carries the module's D, L or P. The bare wordmark, opus.svg, is
the lockup without them: the suite's own name, for pages about OPUS as a whole.

    ./build.sh
"""

from __future__ import annotations

import io
import os
import subprocess
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ICONS = HERE / "icons"
ANDROID = HERE / "android"

INK = "#147b76"
TILE_INK = "#72ddd1"
MODULE_INK = "#c36e12"
DIVIDER_INK = "#79aaa6"
TILE_FROM, TILE_TO = "#083b3b", "#147a72"
PLACE = "translate(11.5 12) scale(.76)"
PLACE_XY, PLACE_S = (11.5, 12.0), 0.76

STROKE = ('fill="none" stroke="{}" stroke-width="13" '
          'stroke-linecap="round" stroke-linejoin="round"')
GLYPH = {
    "O": '<ellipse cx="48" cy="48" rx="31" ry="35"/>',
    "P": '<path d="M18 83V13h24c20 0 31 7 31 20S62 53 42 53H18"/>',
    "U": '<path d="M14 13v42c0 19 12 29 29 29s29-10 29-29V13"/>',
    "S": '<path d="M70 22c-7-6-16-9-26-9-18 0-29 8-29 19 0 27 57 12 57 35 0 11-12 17-29 17-12 0-23-4-31-11"/>',
    "D": '<path d="M18 13v70h18c25 0 39-13 39-35S61 13 36 13H18"/>',
    "L": '<path d="M18 13v70h51"/>',
}
# The same outlines as VectorDrawable path data; the ellipse becomes two arcs.
PATH = {
    "O": "M17,48a31,35 0 1,0 62,0a31,35 0 1,0 -62,0z",
    **{k: v.split('"')[1] for k, v in GLYPH.items() if k != "O"},
}
WORD = (("O", 0, True), ("P", 92, False), ("U", 180, False), ("S", 270, False))
DIVIDER = (365, 12, 3, 72, 1.5)
MODULES = {"downloads": ("D", 379), "player": ("P", 380), "library": ("L", 381)}

CUT = "M55 4h15L53 38H38Z"
# The same cut as a clip: VectorDrawable has no mask. Its two edges run on to the
# top of the glyph box, where the glyph has no ink (the stroke starts at y 6.5).
CUT_CLIP = "M0,0H57L38,38H53L72,0H96V96H0Z"
MASK = ('<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">'
        f'<rect width="96" height="96" fill="#fff"/><path d="{CUT}" fill="#000"/></mask>')
ARC = "M10 17C31 2 65 2 86 17"

FAVICON_SIDE = 86
# Launchers that crop to a circle keep only the inner 40 % radius; the family
# shrinks its tile content by the same factor, so all three products match.
MASKABLE_SCALE = 0.9
BANNER_W, BANNER_H, BANNER_FILL = 320, 180, 0.7

OWNER = os.environ.get("OWNER")


def glyph(name: str, colour: str, *, cut: bool = False) -> str:
    g = f'<g {STROKE.format(colour)}>{GLYPH[name]}</g>'
    return f'<g mask="url(#cut)">{g}</g>' if cut else g


def document(viewbox: str, body: str, defs: str = "", label: str = "") -> str:
    title = f"<title>{label}</title>" if label else ""
    aria = f' role="img" aria-label="{label}"' if label else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}"{aria}>'
            f"{title}<defs>{MASK}{defs}</defs>{body}</svg>\n")


def render(svg: str, width: int, height: int | None = None) -> Image.Image:
    png = subprocess.run(["rsvg-convert", "-w", str(width), "-h", str(height or width)],
                         input=svg.encode(), capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(png)).convert("RGBA")


def ink_box(body: str, viewbox: tuple[float, float, float, float]) -> tuple[float, ...]:
    """The rendered ink's bounds, in the document's own units."""
    x, y, w, h = viewbox
    px = 20
    img = render(document(f"{x} {y} {w} {h}", body), round(w * px), round(h * px))
    x0, y0, x1, y1 = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return x + x0 / px, y + y0 / px, x + x1 / px, y + y1 / px


def write(path: Path, data: bytes | str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        path.write_text(data)
    else:
        path.write_bytes(data)
    if OWNER:
        uid, gid = (int(n) for n in OWNER.split(":"))
        os.chown(path, uid, gid)
    print(f"  {path.relative_to(HERE)}")


def png(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, "PNG", optimize=True)
    return out.getvalue()


def favicon() -> str:
    x0, y0, x1, y1 = ink_box(glyph("O", INK, cut=True), (0, 0, 96, 96))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = FAVICON_SIDE / 2
    return document(f"{cx - half:g} {cy - half:g} {FAVICON_SIDE} {FAVICON_SIDE}",
                    glyph("O", INK, cut=True), label="OPUS")


def word() -> str:
    return "".join(f'<g transform="translate({d})">{glyph(n, INK, cut=c)}</g>' for n, d, c in WORD)


def wordmark() -> str:
    x0, y0, x1, y1 = ink_box(word(), (0, 0, 440, 96))
    return document(f"{x0:g} {y0:g} {x1 - x0:g} {y1 - y0:g}", word(), label="OPUS")


def lockup(module: str) -> str:
    initial, x = MODULES[module]
    dx, dy, w, h, r = DIVIDER
    body = (word()
            + f'<rect x="{dx}" y="{dy}" width="{w}" height="{h}" rx="{r}" fill="{DIVIDER_INK}"/>'
            + f'<g transform="translate({x} 6.5) scale(.5)">{glyph(initial, MODULE_INK)}</g>')
    x0, y0, x1, y1 = ink_box(body, (0, 0, 440, 96))
    return document(f"{x0:g} {y0:g} {x1 - x0:g} {y1 - y0:g}", body,
                    label=f"OPUS {module.capitalize()}")


def tile(*, rounded: bool, scale: float = 1.0) -> str:
    gradient = ('<linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">'
                f'<stop stop-color="{TILE_FROM}"/><stop offset="1" stop-color="{TILE_TO}"/>'
                "</linearGradient>")
    rx = ' rx="22"' if rounded else ""
    content = (f'<path d="{ARC}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>'
               f'<g transform="{PLACE}">{glyph("O", TILE_INK, cut=True)}</g>')
    if scale != 1.0:
        content = f'<g transform="translate(48 48) scale({scale:g}) translate(-48 -48)">{content}</g>'
    return document("0 0 96 96", f'<rect width="96" height="96"{rx} fill="url(#tile)"/>{content}',
                    defs=gradient)


def vector(width: int, height: int, body: str, *, aapt: bool = False) -> str:
    ns = '\n    xmlns:aapt="http://schemas.android.com/aapt"' if aapt else ""
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            f'<vector xmlns:android="http://schemas.android.com/apk/res/android"{ns}\n'
            f'    android:width="{width}dp"\n    android:height="{height}dp"\n'
            f'    android:viewportWidth="{width}"\n    android:viewportHeight="{height}">\n'
            f"{body}</vector>\n")


def group(tx: float, ty: float, s: float, body: str, pad: str = "    ") -> str:
    return (f'{pad}<group\n{pad}    android:translateX="{tx:g}"\n{pad}    android:translateY="{ty:g}"\n'
            f'{pad}    android:scaleX="{s:g}"\n{pad}    android:scaleY="{s:g}">\n{body}{pad}</group>\n')


def stroke(name: str, colour: str, pad: str, *, cut: bool = False) -> str:
    clip = f'{pad}<clip-path android:pathData="{CUT_CLIP}" />\n' if cut else ""
    return (f'{clip}{pad}<path\n{pad}    android:pathData="{PATH[name]}"\n'
            f'{pad}    android:strokeColor="{colour}"\n{pad}    android:strokeWidth="13"\n'
            f'{pad}    android:strokeLineCap="round"\n{pad}    android:strokeLineJoin="round" />\n')


def gradient_fill(path: str, x0: float, y0: float, x1: float, y1: float) -> str:
    return (f'    <path android:pathData="{path}">\n'
            '        <aapt:attr name="android:fillColor">\n'
            '            <gradient\n                android:type="linear"\n'
            f'                android:startX="{x0:g}"\n                android:startY="{y0:g}"\n'
            f'                android:endX="{x1:g}"\n                android:endY="{y1:g}">\n'
            f'                <item android:offset="0" android:color="{TILE_FROM}" />\n'
            f'                <item android:offset="1" android:color="{TILE_TO}" />\n'
            "            </gradient>\n        </aapt:attr>\n    </path>\n")


def android_foreground() -> str:
    # The 96-unit tile fills the 72 dp an adaptive icon shows of its 108 dp canvas.
    (tx, ty), s = PLACE_XY, PLACE_S
    return vector(108, 108, group(18 + 0.75 * tx, 18 + 0.75 * ty, 0.75 * s,
                                  stroke("O", TILE_INK, "        ", cut=True)))


def android_background() -> str:
    arc = ('        <path\n'
           f'            android:pathData="{ARC}"\n'
           '            android:strokeColor="#FFFFFF"\n            android:strokeAlpha="0.08"\n'
           '            android:strokeWidth="2" />\n')
    return vector(108, 108, gradient_fill("M0,0h108v108h-108z", 18, 18, 90, 90)
                  + group(18, 18, 0.75, arc), aapt=True)


def android_banner(module: str) -> str:
    """The lockup on the tile's ground: a leanback banner is the TV's app icon."""
    initial, x = MODULES[module]
    x0, x1, y0, y1 = 10.5, 419.75, 6.5, 90.5
    s = BANNER_W * BANNER_FILL / (x1 - x0)
    tx, ty = BANNER_W / 2 - s * (x0 + x1) / 2, BANNER_H / 2 - s * (y0 + y1) / 2
    pad = "            "
    letters = "".join(group(d, 0, 1, stroke(n, TILE_INK, pad, cut=c), "        ")
                      for n, d, c in WORD)
    dx, dy, w, h, r = DIVIDER
    divider = (f'        <path\n            android:fillColor="{DIVIDER_INK}"\n'
               f'            android:pathData="M{dx},{dy + r}a{r},{r} 0 0,1 {w},0v{h - 2 * r}'
               f'a{r},{r} 0 0,1 -{w},0z" />\n')
    small = group(x, 6.5, 0.5, stroke(initial, MODULE_INK, pad), "        ")
    body = (gradient_fill(f"M0,0h{BANNER_W}v{BANNER_H}h-{BANNER_W}z", 0, 0, BANNER_W, BANNER_H)
            + group(tx, ty, s, letters + divider + small))
    return vector(BANNER_W, BANNER_H, body, aapt=True).replace(
        "<vector xmlns:android", "<vector xmlns:tools=\"http://schemas.android.com/tools\"\n"
        "    tools:ignore=\"VectorRaster\"\n    xmlns:android", 1)


def main() -> None:
    mark = favicon()
    print("browser")
    write(HERE / "favicon.svg", mark)
    sizes = {n: render(mark, n) for n in (16, 32, 48)}
    write(HERE / "favicon-16x16.png", png(sizes[16]))
    write(HERE / "favicon-32x32.png", png(sizes[32]))
    ico = io.BytesIO()
    sizes[48].save(ico, "ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                   append_images=[sizes[16], sizes[32]])
    write(HERE / "favicon.ico", ico.getvalue())

    print("installed")
    write(ICONS / "icon-192.png", png(render(tile(rounded=True), 192)))
    write(ICONS / "icon-512.png", png(render(tile(rounded=True), 512)))
    # iOS rounds the corners itself and puts black behind transparency.
    write(ICONS / "apple-touch-icon.png",
          png(render(tile(rounded=False), 180).convert("RGB")))
    for n in (192, 512):
        write(ICONS / f"icon-maskable-{n}.png",
              png(render(tile(rounded=False, scale=MASKABLE_SCALE), n).convert("RGB")))

    print("lockups")
    write(HERE / "opus.svg", wordmark())
    for module in MODULES:
        write(HERE / f"opus-{module}.svg", lockup(module))

    print("android")
    write(ANDROID / "opus_mark.xml", android_foreground())
    write(ANDROID / "opus_tile.xml", android_background())
    write(ANDROID / "player_banner.xml", android_banner("player"))


if __name__ == "__main__":
    main()
