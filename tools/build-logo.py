#!/usr/bin/env python3
"""Regenerate the JT Builds Co. logo assets from the monogram geometry.

DEV TOOL ONLY. The site does not run this and neither does Vercel — the files
it writes are committed and served as-is. You only need it if the mark, the
wordmark or the brand colours change.

    pip install fonttools brotli uharfbuzz
    # Inter is not committed. Grab the latin subset Google serves:
    #   curl -sS "https://fonts.googleapis.com/css2?family=Inter:wght@400;500" \
    #     -H "User-Agent: Mozilla/5.0 Chrome/120"
    # then download the woff2 URL from the /* latin */ block to
    # tools/inter-latin.woff2 (or point INTER_WOFF2 at any copy of the font).
    python3 tools/build-logo.py

The wordmark is converted to outlines, so the finished SVGs carry no font
dependency and render identically everywhere, including inside <img>. The two
rasters the platforms insist on — favicon.png and og-image.png — are drawn from
the same geometry with Pillow, supersampled and downscaled.
"""

import os
import io

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
import uharfbuzz as hb
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, "assets")
FONT = os.environ.get("INTER_WOFF2", os.path.join(HERE, "inter-latin.woff2"))

# ---------------------------------------------------------------- geometry --
# One spine, two letters. The T is the spine and the crossbar; the J is the
# spine and the foot. 96 x 81 grid, stroke weight 23.
MARK = "M14 0H96V23H57.5V81H0V42H23V58H34.5V23H14Z"
# The two 45 degree kerfs, cut out of the mark above.
KERF = ("M31.18 22.08L58.42 49.32L60.82 46.92L33.58 19.68Z"
        "M31.18 57.08L58.42 84.32L60.82 81.92L33.58 54.68Z")
VB_W, VB_H = 96, 81

# the same two shapes as coordinate lists, for the Pillow rasters
MARK_PTS = [(14, 0), (96, 0), (96, 23), (57.5, 23), (57.5, 81), (0, 81),
            (0, 42), (23, 42), (23, 58), (34.5, 58), (34.5, 23), (14, 23)]
KERF_PTS = [
    [(31.18, 22.08), (58.42, 49.32), (60.82, 46.92), (33.58, 19.68)],
    [(31.18, 57.08), (58.42, 84.32), (60.82, 81.92), (33.58, 54.68)],
]

WHITE = "#FFFFFF"
BLACK = "#000000"
PURPLE = "#4B2E83"      # brand purple, from the identity system
INK = "#161826"         # --color-neutral-900, the site background
TEXT = "#EDEDF1"        # --color-neutral-100
MUTED = "#9494A6"       # --color-neutral-400


def mark_svg(fill, kerfed=True, pad=0):
    """A standalone SVG of the symbol alone."""
    w, h = VB_W + pad * 2, VB_H + pad * 2
    body = (
        f'<mask id="k" maskUnits="userSpaceOnUse" x="-4" y="-4" width="104" height="94">'
        f'<path d="{MARK}" fill="#fff"/><path d="{KERF}" fill="#000"/></mask>'
        f'<g mask="url(#k)"><path d="{MARK}" fill="{fill}"/></g>'
    ) if kerfed else f'<path d="{MARK}" fill="{fill}"/>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {w} {h}" '
        f'width="{w}" height="{h}" role="img" aria-label="JT Builds Co.">'
        f'<title>JT Builds Co.</title>{body}</svg>\n'
    )


# ---------------------------------------------------------------- wordmark --
def _instance(weight):
    """A static instance of the Inter variable font at one weight."""
    f = TTFont(FONT)
    f = instancer.instantiateVariableFont(f, {"wght": weight}, inplace=False)
    # drop the woff2 wrapper: HarfBuzz reads sfnt, not compressed web fonts
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return f, buf.getvalue()


def text_path(text, size, weight=500, tracking=0.0):
    """Shape `text` and return (svg path data, advance width).

    tracking is in em, matching CSS letter-spacing. Shaping runs through
    HarfBuzz so kerning is real rather than approximated.
    """
    font, raw = _instance(weight)
    upem = font["head"].unitsPerEm
    scale = size / upem

    face = hb.Face(raw)
    hbfont = hb.Font(face)
    hbfont.scale = (upem, upem)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})

    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    track_units = tracking * upem

    parts = []
    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = glyph_order[info.codepoint]
        pen = SVGPathPen(glyph_set)
        glyph_set[name].draw(pen)
        d = pen.getCommands()
        if d:
            # y flips: font units go up, SVG goes down.
            tx = (x + pos.x_offset) * scale
            ty = pos.y_offset * scale
            parts.append(
                f'<g transform="translate({_n(tx)} {_n(ty)}) '
                f'scale({_n(scale)} {_n(-scale)})"><path d="{d}"/></g>'
            )
        x += pos.x_advance + track_units

    # the trailing track is spacing after the last glyph, not part of the word
    width = (x - track_units) * scale if text else 0.0
    return "".join(parts), width


def cap_height(weight=500):
    font, _ = _instance(weight)
    os2 = font["OS/2"]
    ch = getattr(os2, "sCapHeight", None) or 1490
    return ch / font["head"].unitsPerEm


def _n(v):
    """Trim float noise so the committed files stay readable."""
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return s if s not in ("", "-0") else "0"


# ----------------------------------------------------------------- lockups --
def lockup(mark_fill, name_fill, sub_fill, kerfed=True):
    """Horizontal lockup: symbol, then BUILDS CO. over WEB & BRAND STUDIO."""
    H = 224.0
    mark_h = 116.0
    mark_w = mark_h * VB_W / VB_H
    mark_y = (H - mark_h) / 2
    gap = 42.0
    text_x = mark_w + gap

    name_size, name_track = 68.0, 0.012
    sub_size, sub_track = 29.0, 0.155

    name_d, name_w = text_path("BUILDS CO.", name_size, 500, name_track)
    sub_d, sub_w = text_path("WEB & BRAND STUDIO", sub_size, 400, sub_track)

    name_cap = name_size * cap_height(500)
    sub_cap = sub_size * cap_height(400)

    # optical vertical rhythm: two cap-height blocks, 26 apart, centred on H/2
    block = name_cap + 26.0 + sub_cap
    top = (H - block) / 2
    name_base = top + name_cap
    sub_base = top + name_cap + 26.0 + sub_cap

    W = text_x + max(name_w, sub_w)

    mask = (
        f'<mask id="lk" maskUnits="userSpaceOnUse" x="-4" y="-4" width="104" height="94">'
        f'<path d="{MARK}" fill="#fff"/><path d="{KERF}" fill="#000"/></mask>'
    )
    sym = (
        f'<g transform="translate(0 {_n(mark_y)}) '
        f'scale({_n(mark_w / VB_W)} {_n(mark_h / VB_H)})">'
        + (f'{mask}<g mask="url(#lk)"><path d="{MARK}" fill="{mark_fill}"/></g>'
           if kerfed else f'<path d="{MARK}" fill="{mark_fill}"/>')
        + "</g>"
    )
    words = (
        f'<g fill="{name_fill}" transform="translate({_n(text_x)} {_n(name_base)})">{name_d}</g>'
        f'<g fill="{sub_fill}" transform="translate({_n(text_x)} {_n(sub_base)})">{sub_d}</g>'
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_n(W)} {_n(H)}" '
        f'width="{_n(W)}" height="{_n(H)}" role="img" '
        f'aria-label="JT Builds Co. — Web &amp; Brand Studio">'
        f'<title>JT Builds Co. — Web &amp; Brand Studio</title>{sym}{words}</svg>\n'
    )
    return svg, W, H



# ------------------------------------------------------------------ raster --
SS = 4  # supersampling factor for the Pillow output


def mark_layer(height, fill, kerfed=True):
    """An RGBA layer holding just the symbol, antialiased. Kerfs are cut to
    transparent rather than painted, so anything behind them shows through."""
    h = int(round(height * SS))
    w = int(round(h * VB_W / VB_H))
    k = h / VB_H
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon([(x * k, y * k) for x, y in MARK_PTS], fill=fill)
    if kerfed:
        for kerf in KERF_PTS:
            d.polygon([(x * k, y * k) for x, y in kerf], fill=(0, 0, 0, 0))
    return layer.resize((w // SS, h // SS), Image.LANCZOS)


def pil_font(size, weight=500):
    _, raw = _instance(weight)
    return ImageFont.truetype(io.BytesIO(raw), int(round(size)))


def tracked(draw, xy, text, font, fill, tracking=0.0):
    """Pillow has no letter-spacing, so step the glyphs by hand."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, anchor="ls")
        x += draw.textlength(ch, font=font) + tracking * font.size
    return x - tracking * font.size


def text_width(draw, text, font, tracking=0.0):
    w = sum(draw.textlength(c, font=font) for c in text)
    return w + tracking * font.size * (len(text) - 1)


def build_favicon(path, px=256):
    """Solid cut, white on the site's ink. Browsers show this at 16-32px, well
    under the kerf floor, so there are no seams in it."""
    img = Image.new("RGBA", (px, px), _rgb(INK) + (255,))
    mark = mark_layer(px * 0.50, _rgb(WHITE) + (255,), kerfed=False)
    img.alpha_composite(mark, ((px - mark.width) // 2, (px - mark.height) // 2))
    img.save(path)
    print(f"  {os.path.basename(path):28} {px}x{px}")


def build_og(path, w=1200, h=630):
    """The card that shows up when a link is pasted anywhere."""
    img = Image.new("RGB", (w, h), _rgb(INK))

    # the same soft accent bloom the old card had, top right. Computed at low
    # resolution and scaled up: stacked ellipses band, a smooth falloff does not.
    lw, lh = 160, 84
    mask = Image.new("L", (lw, lh))
    cx, cy, r = lw * 0.84, lh * -0.04, lw * 0.42
    px = mask.load()
    for y in range(lh):
        for x in range(lw):
            t = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / r
            px[x, y] = int(56 * max(0.0, 1.0 - t) ** 2.1) if t < 1 else 0
    mask = mask.resize((w, h), Image.BICUBIC)
    glow = Image.new("RGBA", (w, h), _rgb("#9184D9") + (255,))
    glow.putalpha(mask)
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    d = ImageDraw.Draw(img)

    mark_h = 150
    name_f = pil_font(74, 500)
    sub_f = pil_font(31, 400)
    name, sub = "BUILDS CO.", "WEB & BRAND STUDIO"
    name_tr, sub_tr = 0.012, 0.155

    tw = max(text_width(d, name, name_f, name_tr), text_width(d, sub, sub_f, sub_tr))
    mark_w = mark_h * VB_W / VB_H
    gap = 54
    total = mark_w + gap + tw
    x0 = (w - total) / 2
    cy2 = h / 2 - 16

    mark = mark_layer(mark_h, _rgb(WHITE) + (255,))
    img.alpha_composite(mark, (int(x0), int(cy2 - mark.height / 2)))
    d = ImageDraw.Draw(img)

    tx = x0 + mark_w + gap
    tracked(d, (tx, cy2 - 6), name, name_f, _rgb(TEXT) + (255,), name_tr)
    tracked(d, (tx, cy2 + 46), sub, sub_f, _rgb(MUTED) + (255,), sub_tr)
    d.rectangle([tx, cy2 + 92, tx + 210, cy2 + 94], fill=_rgb("#7A6DC4") + (255,))

    img.convert("RGB").save(path, quality=94)
    print(f"  {os.path.basename(path):28} {w}x{h}")


def build_schema_logo(path, w=600, h=260):
    """Organization.logo for the JSON-LD. Search UIs put this on white, so it
    is the purple-on-light cut rather than the reversed one."""
    img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    name_f = pil_font(46, 500)
    sub_f = pil_font(19, 400)
    name, sub = "BUILDS CO.", "WEB & BRAND STUDIO"
    name_tr, sub_tr = 0.012, 0.155
    tw = max(text_width(d, name, name_f, name_tr), text_width(d, sub, sub_f, sub_tr))
    mark_h = 94
    mark_w = mark_h * VB_W / VB_H
    gap = 34
    x0 = (w - (mark_w + gap + tw)) / 2
    cy = h / 2

    mark = mark_layer(mark_h, _rgb(PURPLE) + (255,))
    img.alpha_composite(mark, (int(x0), int(cy - mark.height / 2)))
    d = ImageDraw.Draw(img)
    tx = x0 + mark_w + gap
    tracked(d, (tx, cy - 4), name, name_f, (32, 30, 29, 255), name_tr)
    tracked(d, (tx, cy + 30), sub, sub_f, (74, 71, 70, 255), sub_tr)
    img.convert("RGB").save(path)
    print(f"  {os.path.basename(path):28} {w}x{h}")


def _rgb(hexstr):
    hexstr = hexstr.lstrip("#")
    return tuple(int(hexstr[i:i + 2], 16) for i in (0, 2, 4))


def write(rel, text):
    path = os.path.join(ASSETS, rel)
    with io.open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print(f"  {rel:28} {len(text.encode('utf-8')):>7,} bytes")


def main():
    if not os.path.exists(FONT):
        raise SystemExit(
            f"Inter not found at {FONT}.\n"
            "Fetch the latin subset from the Google Fonts css2 endpoint (see the "
            "note at the top of this file), or set INTER_WOFF2 to any copy of the "
            "Inter variable font."
        )
    print("symbol")
    write("logo-icon.svg", mark_svg(WHITE))                       # on the dark site
    write("logo-mark-purple.svg", mark_svg(PURPLE))               # brand, light grounds
    write("logo-mark-black.svg", mark_svg(BLACK))                 # one-colour print
    write("logo-mark-solid.svg", mark_svg(WHITE, kerfed=False))   # below 24px
    write("logo-mark-solid-black.svg", mark_svg(BLACK, kerfed=False))

    print("lockup")
    # The nav shows this 38px tall, which puts the symbol near 20px — under the
    # 24px floor where the kerf stops reading as a seam and starts reading as
    # dirt. So the small lockup takes the solid cut.
    svg, w, h = lockup(WHITE, TEXT, MUTED, kerfed=False)
    write("logo-lockup.svg", svg)
    write("logo-lockup-large.svg", lockup(WHITE, TEXT, MUTED)[0])
    write("logo-lockup-black.svg", lockup(BLACK, BLACK, "#4a4746")[0])
    print(f"  lockup aspect {w:.2f} x {h:.2f}  ->  at 38px tall, width "
          f"{round(38 * w / h)}px")
    print(f"  symbol inside it at 38px tall: {116 / 224 * 38:.1f}px "
          f"(kerf floor is 24px)")

    print("raster")
    build_favicon(os.path.join(ASSETS, "favicon.png"))
    build_og(os.path.join(ASSETS, "og-image.png"))
    build_schema_logo(os.path.join(ASSETS, "logo-schema.png"))


if __name__ == "__main__":
    main()
