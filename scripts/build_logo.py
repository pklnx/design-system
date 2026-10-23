"""Builds the pklnx wordmark from IBM Plex Mono and writes the logo SVGs.

The wordmark: "pklnx" in Plex Mono Bold, the star as the dot, "space" in
Plex Mono Regular, all eleven cells on the monospace grid, the space bar
bracket underneath. Text is converted to paths, so the files need no fonts.

Output: theme/logo-geometry.json (used by the component bundle) and the
SVG files in project/assets/Logos/.
"""
import json
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "node_modules/@ibm/plex-mono/fonts/complete/woff2")
SIZE = 100  # font size in SVG units

COLORS = json.load(open(os.path.join(ROOT, "theme/brand.json")))["logo"]


def glyph_path(font, char, x, scale):
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(char)]
    pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
    tpen = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
    gs[name].draw(tpen)
    bpen = BoundsPen(gs)
    gs[name].draw(TransformPen(bpen, (scale, 0, 0, -scale, x, 0)))
    return pen.getCommands(), bpen.bounds, gs[name].width * scale


def fmt(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")


def star_path(cx, cy, r, waist):
    """Four-pointed star with flat tips, as in the original mark."""
    t = r * 0.12  # half width of the flat tip
    w = waist
    pts = [
        (cx - t, cy - r), (cx + t, cy - r), (cx + w, cy - w), (cx + r, cy - t),
        (cx + r, cy + t), (cx + w, cy + w), (cx + t, cy + r), (cx - t, cy + r),
        (cx - w, cy + w), (cx - r, cy + t), (cx - r, cy - t), (cx - w, cy - w),
    ]
    return "M" + " L".join(fmt(x) + " " + fmt(y) for x, y in pts) + " Z"


def main():
    bold = TTFont(os.path.join(FONTS, "IBMPlexMono-Bold.woff2"))
    regular = TTFont(os.path.join(FONTS, "IBMPlexMono-Regular.woff2"))
    scale = SIZE / bold["head"].unitsPerEm
    cell = bold["hmtx"]["zero"][0] * scale  # monospace advance

    paths, x, xmin, xmax, ymax = [], 0.0, 1e9, -1e9, -1e9
    for i, ch in enumerate("pklnx space"):
        if ch == " ":
            star_cx = x + cell / 2
            x += cell
            continue
        font = bold if i < 5 else regular
        d, b, adv = glyph_path(font, ch, x, scale)
        paths.append(d)
        xmin, xmax, ymax = min(xmin, b[0]), max(xmax, b[2]), max(ymax, b[3])
        x += cell

    xh = regular["OS/2"].sxHeight * scale  # x-height
    # Star sits on the baseline like a period, a little more than half the x-height tall.
    r = xh * 0.3
    star = star_path(star_cx, -r, r, r * 0.34)

    # Space bar bracket: tips rise just above the baseline, bar sits below the descender.
    stroke = 8.5
    inset = 34
    left, right = xmin - inset, xmax + inset
    top = -6
    inner = ymax + 12  # descender (ymax, since y is flipped) plus clearance
    bottom = inner + stroke
    bracket = (
        f"M{fmt(left)} {top} L{fmt(left)} {fmt(bottom)} L{fmt(right)} {fmt(bottom)} L{fmt(right)} {top} "
        f"L{fmt(right - stroke)} {top} L{fmt(right - stroke)} {fmt(inner)} L{fmt(left + stroke)} {fmt(inner)} L{fmt(left + stroke)} {top} Z"
    )
    asc = bold["OS/2"].sCapHeight * scale
    vb_top = -round(asc + 2)
    vb = f"{fmt(left)} {vb_top} {fmt(right - left)} {fmt(bottom - vb_top)}"

    # Mark: the bracket with the star, unchanged from the original mark.
    mark = {
        "bracket": "M5.5 24.5 L5.5 51.5 L58.5 51.5 L58.5 24.5 L51.5 24.5 L51.5 44.5 L12.5 44.5 L12.5 24.5 Z",
        "star": star_path(32, 28, 15, 15 * 0.34),
        "viewBox": "0 0 64 64",
    }
    geo = {"word": {"text": " ".join(paths), "star": star, "bracket": bracket, "viewBox": vb}, "mark": mark}
    os.makedirs(os.path.join(ROOT, "theme"), exist_ok=True)
    json.dump(geo, open(os.path.join(ROOT, "theme/logo-geometry.json"), "w"), indent=1)

    out = os.path.join(ROOT, "project/assets/Logos")
    os.makedirs(out, exist_ok=True)

    def word_svg(ink, star_c, title="pklnx.space"):
        w = geo["word"]
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{w["viewBox"]}" role="img" aria-label="{title}">'
                f'<title>{title}</title><path fill="{ink}" d="{w["text"]}"/><path fill="{star_c}" d="{w["star"]}"/>'
                f'<path fill="{ink}" d="{w["bracket"]}"/></svg>\n')

    def mark_svg(ink, star_c, bg=None, shape=None):
        m = geo["mark"]
        back = ""
        if bg and shape == "tile":
            back = f'<rect width="64" height="64" rx="14" fill="{bg}"/>'
        elif bg and shape == "circle":
            back = f'<circle cx="32" cy="32" r="32" fill="{bg}"/>'
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="pklnx.space">'
                f'<title>pklnx.space</title>{back}<path fill="{ink}" d="{m["bracket"]}"/><path fill="{star_c}" d="{m["star"]}"/></svg>\n')

    c = COLORS
    files = {
        "pklnx-wordmark-dark.svg": word_svg(c["dark"]["ink"], c["dark"]["star"]),
        "pklnx-wordmark-light.svg": word_svg(c["light"]["ink"], c["light"]["star"]),
        "pklnx-wordmark-black.svg": word_svg("#000000", "#000000"),
        "pklnx-wordmark-white.svg": word_svg("#ffffff", "#ffffff"),
        "pklnx-mark-dark.svg": mark_svg(c["dark"]["ink"], c["dark"]["star"]),
        "pklnx-mark-light.svg": mark_svg(c["light"]["ink"], c["light"]["star"]),
        "pklnx-mark-black.svg": mark_svg("#000000", "#000000"),
        "pklnx-mark-white.svg": mark_svg("#ffffff", "#ffffff"),
        "pklnx-favicon.svg": mark_svg(c["dark"]["ink"], c["dark"]["star"], c["dark"]["ground"], "tile"),
        "pklnx-avatar.svg": mark_svg(c["dark"]["ink"], c["dark"]["star"], c["dark"]["ground"], "circle"),
    }
    for name, svg in files.items():
        open(os.path.join(out, name), "w").write(svg)
    print("viewBox", vb, "cell", cell, "x-height", xh)


if __name__ == "__main__":
    main()
