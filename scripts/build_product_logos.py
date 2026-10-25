"""Builds the product marks of mail-archive and paperless-go and writes their SVGs.

Both marks use the formal language of the pklnx mark (build_logo.py): the 64 x 64 grid,
7-unit strokes, square corners and the four-pointed flat-tip star as the only accent.
The geometry is the reference posted on design-system issue #12:

- mail-archive, archive box: a lid bar over an open box, the star as the label.
- paperless-go, file: a page with the top-right corner cut at 45 degrees, the fold as a
  7-unit L, the star on the page.

All shapes are filled paths; only paperless-go's page uses fill-rule="evenodd" for its hole.
The lockup sets the product name in IBM Plex Mono SemiBold, converted to paths, so the
files need no fonts.

Output: project/assets/Logos/products/*.svg. The PNGs and manifest.json come from
scripts/render_pngs.mjs; the social images from scripts/build_assets.py.
"""
import json
import math
import os

from build_logo import star_path, glyph_path, fmt, FONTS, ROOT
from fontTools.ttLib import TTFont

COLORS = json.load(open(os.path.join(ROOT, "theme/brand.json")))["logo"]
OUT = os.path.join(ROOT, "project/assets/Logos/products")

S = 7  # stroke of the pklnx mark
TILE_RX = 14  # corner radius of the tile, as pklnx-favicon.svg
TILE_CLEAR = S  # clear space around the mark on the tile and the touch icon: one stroke

FONT_SIZE = 100  # name size in lockup units
STEM = 12.8  # stem of the "l" in Plex Mono SemiBold at size 100 (glyf x 236-364 of 1000)
K = STEM / S  # lockup scale of the mark: 7-unit stroke = SemiBold stem
MASKABLE = 512  # maskable icon size
MASKABLE_SCALE = 5.6  # px per mark unit; the safe circle (r 0.4 x 512) allows 5.84 (C) and 5.99 (A)


def poly(pts):
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts) + " Z"


def page_file(x0, y0, x1, y1, c):
    """Page with the top-right corner cut at 45 degrees (cut length c) and the fold as
    an L-shaped 7-unit notch: the outer outline and the hole, for fill-rule evenodd.
    Returns the outlines and the vertical centre of the hole below the fold."""
    outer = [(x0, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1), (x0, y1)]
    fx, fy = x1 - c - S, y0 + c + S  # inner edges of the fold legs
    hole = [(x0 + S, y0 + S), (fx, y0 + S), (fx, fy), (x1 - S, fy), (x1 - S, y1 - S), (x0 + S, y1 - S)]
    return [outer, hole], (fy + y1 - S) / 2


_page, _page_cy = page_file(11, 5, 53, 59, 12)

# Each product: its shapes (list of outlines per path, fill rule) and its star (cx, cy, r).
PRODUCTS = {
    "mail-archive": {
        "shapes": [
            ([[(3.5, 13.5), (60.5, 13.5), (60.5, 20.5), (3.5, 20.5)]], None),  # lid
            ([[(7.5, 24.5), (7.5, 54.5), (56.5, 54.5), (56.5, 24.5), (49.5, 24.5),
               (49.5, 47.5), (14.5, 47.5), (14.5, 24.5)]], None),  # box, open at the top
        ],
        "star": (32, 35, 10),
    },
    "paperless-go": {
        "shapes": [(_page, "evenodd")],
        "star": (32, _page_cy, 9.5),
    },
}


def star_d(star):
    cx, cy, r = star
    return star_path(cx, cy, r, r * 0.34)


def star_points(star):
    cx, cy, r = star
    return [(cx - r, cy - r), (cx + r, cy + r)]


def mark_bbox(product):
    """Bounding box (x0, y0, x1, y1) of a mark in its 64-unit grid."""
    p = PRODUCTS[product]
    pts = [pt for outlines, _ in p["shapes"] for outline in outlines for pt in outline]
    pts += star_points(p["star"])
    xs, ys = [x for x, _ in pts], [y for _, y in pts]
    return min(xs), min(ys), max(xs), max(ys)


# One scale for the marks of all products on the tile and the touch icon, so both icons
# have the same stroke: the largest that keeps TILE_CLEAR on every side of the widest or
# tallest mark, rounded down to eighths so the transforms are exact in the SVG.
_extent = max(max(x1 - x0, y1 - y0) for x0, y0, x1, y1 in map(mark_bbox, PRODUCTS))
TILE_SCALE = math.floor((64 - 2 * TILE_CLEAR) / _extent * 8) / 8


def tile_transform(product):
    """The transform that centres the mark's bounding box on the 64-unit tile at TILE_SCALE."""
    x0, y0, x1, y1 = mark_bbox(product)
    tx, ty = 32 - (x0 + x1) / 2 * TILE_SCALE, 32 - (y0 + y1) / 2 * TILE_SCALE
    clear = min(tx + x0 * TILE_SCALE, ty + y0 * TILE_SCALE, 64 - tx - x1 * TILE_SCALE, 64 - ty - y1 * TILE_SCALE)
    assert clear >= TILE_CLEAR, f"{product}: {clear} units of clear space on the tile"
    return f"translate({tx:g} {ty:g}) scale({TILE_SCALE:g})"


def mark_paths(product, ink, star):
    p = PRODUCTS[product]
    out = []
    for outlines, rule in p["shapes"]:
        d = " ".join(poly(o) for o in outlines)
        r = f' fill-rule="{rule}"' if rule else ""
        out.append(f'<path fill="{ink}"{r} d="{d}"/>')
    out.append(f'<path fill="{star}" d="{star_d(p["star"])}"/>')
    return "".join(out)


def svg(view_box, title, body, size=None):
    wh = f' width="{size[0]}" height="{size[1]}"' if size else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}"{wh} role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def lockup(product, ink, star):
    """The lockup's group (mark and name), its tight viewBox (x, y, w, h) and the top of the
    mark's 64-unit box, in lockup units.

    The name is set on baseline 0. The mark is scaled by K, its 64-unit box centred on the
    cap height, and the name starts half a cell after the box."""
    font = TTFont(os.path.join(FONTS, "IBMPlexMono-SemiBold.woff2"))
    scale = FONT_SIZE / font["head"].unitsPerEm
    cell = font["hmtx"]["zero"][0] * scale
    cap = font["OS/2"].sCapHeight * scale
    box = 64 * K
    my = -cap / 2 - box / 2
    tx = box + cell / 2

    paths, x = [], tx
    tb = [math.inf, math.inf, -math.inf, -math.inf]
    for ch in product:
        d, b, _ = glyph_path(font, ch, x, scale)
        paths.append(d)
        tb = [min(tb[0], b[0]), min(tb[1], b[1]), max(tb[2], b[2]), max(tb[3], b[3])]
        x += cell

    mx0, my0, mx1, my1 = mark_bbox(product)
    x0, y0 = min(mx0 * K, tb[0]), min(my + my0 * K, tb[1])
    x1, y1 = max(mx1 * K, tb[2]), max(my + my1 * K, tb[3])
    # Round outwards to the 2 decimals of fmt(), so nothing is clipped.
    x0, y0 = math.floor(x0 * 100) / 100, math.floor(y0 * 100) / 100
    x1, y1 = math.ceil(x1 * 100) / 100, math.ceil(y1 * 100) / 100

    body = (f'<g transform="translate(0 {fmt(my)}) scale({K:.4f})">{mark_paths(product, ink, star)}</g>'
            f'<path fill="{ink}" d="{" ".join(paths)}"/>')
    return body, (x0, y0, x1 - x0, y1 - y0), my


def files(product):
    dark, light = COLORS["dark"], COLORS["light"]
    ground = dark["ground"]
    out = {}
    themes = {"dark": (dark["ink"], dark["star"]), "light": (light["ink"], light["star"]),
              "black": ("#000000", "#000000"), "white": ("#ffffff", "#ffffff")}
    for name, (ink, star) in themes.items():
        out[f"{product}-mark-{name}.svg"] = svg("0 0 64 64", product, mark_paths(product, ink, star))
    for name, (ink, star) in themes.items():
        body, vb, _ = lockup(product, ink, star)
        out[f"{product}-lockup-{name}.svg"] = svg(" ".join(fmt(v) for v in vb), product, body)

    mark = mark_paths(product, dark["ink"], dark["star"])
    # The mark scaled down and centred, with TILE_CLEAR units of clear space on every side.
    tiled = f'<g transform="{tile_transform(product)}">{mark}</g>'
    out[f"{product}-tile.svg"] = svg(
        "0 0 64 64", product, f'<rect width="64" height="64" rx="{TILE_RX}" fill="{ground}"/>{tiled}')
    # iOS rounds the corners itself, so the square is full bleed; the mark keeps the tile's place.
    out[f"{product}-apple-touch-icon.svg"] = svg(
        "0 0 64 64", product, f'<rect width="64" height="64" fill="{ground}"/>{tiled}')
    # Maskable: the mark's bounding box centred, inside the safe circle of radius 0.4 x size.
    x0, y0, x1, y1 = mark_bbox(product)
    c = MASKABLE / 2
    tx, ty = c - (x0 + x1) / 2 * MASKABLE_SCALE, c - (y0 + y1) / 2 * MASKABLE_SCALE
    out[f"{product}-icon-maskable.svg"] = svg(
        f"0 0 {MASKABLE} {MASKABLE}", product,
        f'<rect width="{MASKABLE}" height="{MASKABLE}" fill="{ground}"/>'
        f'<g transform="translate({fmt(tx)} {fmt(ty)}) scale({fmt(MASKABLE_SCALE)})">{mark}</g>')
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for product in PRODUCTS:
        for name, content in files(product).items():
            with open(os.path.join(OUT, name), "w") as f:
                f.write(content)
        print(product, "lockup viewBox", " ".join(fmt(v) for v in lockup(product, "", "")[1]))


if __name__ == "__main__":
    main()
