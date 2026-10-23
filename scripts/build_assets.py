"""Pattern tiles and social images, built from the logo geometry and IBM Plex Mono.

Writes project/assets/Patterns/*.svg and project/assets/Social/*.svg, including the
social images of the products (lockups from build_product_logos.py). Text is converted
to paths, so the files render anywhere without fonts. Run after build_logo.py and
npm run build (reads theme/tokens.json); scripts/render_pngs.mjs renders the PNGs.
"""
import itertools
import json
import math
import os
from build_logo import glyph_path, fmt, ROOT, FONTS
from build_product_logos import lockup, K
from fontTools.ttLib import TTFont

geo = json.load(open(os.path.join(ROOT, "theme/logo-geometry.json")))
tokens = json.load(open(os.path.join(ROOT, "theme/tokens.json")))
D, L = tokens["dark"], tokens["light"]


def text_paths(text, size, weight="Regular"):
    font = TTFont(os.path.join(FONTS, f"IBMPlexMono-{weight}.woff2"))
    scale = size / font["head"].unitsPerEm
    cell = font["hmtx"]["zero"][0] * scale
    out, x = [], 0.0
    for ch in text:
        if ch != " ":
            d, _, _ = glyph_path(font, ch, x, scale)
            out.append(d)
        x += cell
    return " ".join(out), x


def wordmark_group(x, y, height, ink, star):
    w = geo["word"]
    vb = [float(v) for v in w["viewBox"].split()]
    s = height / vb[3]
    tx, ty = x - vb[0] * s, y - vb[1] * s
    g = (f'<g transform="translate({fmt(tx)} {fmt(ty)}) scale({fmt(s)})">'
         f'<path fill="{ink}" d="{w["text"]}"/><path fill="{star}" d="{w["star"]}"/><path fill="{ink}" d="{w["bracket"]}"/></g>')
    return g, vb[2] * s, -vb[0] * s  # group, width, offset of the text start from x


def pattern(ground, line, star):
    m = geo["mark"]
    # Two space bars per 96px tile, a small star in the free corner.
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="Pattern">'
            f'<title>Pattern</title><rect width="96" height="96" fill="{ground}"/>'
            f'<g transform="translate(8 8) scale(0.5)"><path fill="{line}" d="{m["bracket"]}"/><path fill="{line}" d="{m["star"]}"/></g>'
            f'<g transform="translate(56 56) scale(0.5)"><path fill="{line}" d="{m["bracket"]}"/></g>'
            f'<g transform="translate(64 12) scale(0.25)"><path fill="{star}" d="{m["star"]}"/></g></svg>\n')


def dots(w, h, pitch, color, r=1):
    return "".join(f'<rect x="{x - r}" y="{y - r}" width="{2 * r}" height="{2 * r}" fill="{color}"/>'
                   for x in range(pitch, w, pitch) for y in range(pitch, h, pitch))


def social(w, h, mark_h, x, y, tag_size, gap):
    tag, _ = text_paths("infrastructure & cloud engineering", tag_size)
    g, ww, inset = wordmark_group(x, y, mark_h, D["text-primary"], D["star"])
    ty = y + mark_h + gap
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="pklnx.space, infrastructure and cloud engineering">'
            f'<title>pklnx.space</title><rect width="{w}" height="{h}" fill="{D["background"]}"/>{dots(w, h, 40, D["border-subtle-00"])}'
            f'{g}<g transform="translate({fmt(x + inset)} {fmt(ty)})"><path fill="{D["text-secondary"]}" d="{tag}"/></g></svg>\n')


# Product social images (GitHub social preview, Open Graph): 1280 x 640.
PRODUCT_SOCIAL = {
    "mail-archive": "A read-only, deduplicated archive of your IMAP mailboxes, with full-text search and a web UI.",
    "paperless-go": "A self-hosted document archive with OCR, full-text search and a web UI.",
}
SOCIAL_W, SOCIAL_H = 1280, 640
SOCIAL_X = 96  # left edge of the lockup, the description and the wordmark
LOCKUP_BOX = 96  # height of the lockup's 64-unit mark box in px, the same scale for every product
LOCKUP_TOP = 184  # top of the mark box
DESC_SIZE = 28  # description: Plex Mono Regular
DESC_LINE = 40  # line height of the description
DESC_GAP = 72  # mark box bottom to the first baseline of the description
DESC_MAX = math.floor((SOCIAL_W - 2 * SOCIAL_X) / (0.6 * DESC_SIZE))  # 64 characters per line
WORDMARK_H = 28  # the pklnx.space wordmark, bottom left
WORDMARK_BOTTOM = SOCIAL_H - SOCIAL_X


def wrap(text, limit):
    """Breaks text at spaces into as few lines as greedy wrapping needs, each at most limit
    characters, and among those picks the most balanced break (smallest longest line), so
    no short last line is left alone."""
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        if len(w) > limit:
            raise ValueError(f"word longer than {limit} characters: {w}")
        if cur and len(cur) + 1 + len(w) > limit:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}" if cur else w
    n = len(lines) + 1
    best = None
    for cuts in itertools.combinations(range(1, len(words)), n - 1):
        bounds = (0, *cuts, len(words))
        cand = [" ".join(words[a:b]) for a, b in zip(bounds, bounds[1:])]
        longest = max(len(c) for c in cand)
        if longest <= limit and (best is None or longest < max(len(c) for c in best)):
            best = cand
    return best


def product_social(product, description):
    ink, star, muted = D["text-primary"], D["star"], D["text-secondary"]
    body, vb, mark_top = lockup(product, ink, star)
    s = LOCKUP_BOX / (64 * K)  # px per lockup unit
    lx, ly = SOCIAL_X - vb[0] * s, LOCKUP_TOP - mark_top * s
    lines = wrap(description, DESC_MAX)
    y = LOCKUP_TOP + LOCKUP_BOX + DESC_GAP
    desc = ""
    for i, line in enumerate(lines):
        d, _ = text_paths(line, DESC_SIZE)
        desc += f'<g transform="translate({SOCIAL_X} {fmt(y + i * DESC_LINE)})"><path fill="{muted}" d="{d}"/></g>'
    word, _, _ = wordmark_group(SOCIAL_X, WORDMARK_BOTTOM - WORDMARK_H, WORDMARK_H, muted, star)
    label = f"{product}: {description}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SOCIAL_W} {SOCIAL_H}" width="{SOCIAL_W}" height="{SOCIAL_H}" role="img" aria-label="{label}">'
            f'<title>{product}</title><rect width="{SOCIAL_W}" height="{SOCIAL_H}" fill="{D["background"]}"/>'
            f'{dots(SOCIAL_W, SOCIAL_H, 40, D["border-subtle-00"])}'
            f'<g transform="translate({fmt(lx)} {fmt(ly)}) scale({s:.4f})">{body}</g>{desc}{word}</svg>\n')


def main():
    pd = os.path.join(ROOT, "project/assets/Patterns")
    sd = os.path.join(ROOT, "project/assets/Social")
    os.makedirs(pd, exist_ok=True)
    os.makedirs(sd, exist_ok=True)
    open(os.path.join(pd, "pattern-dark.svg"), "w").write(pattern(D["background"], D["border-subtle-00"], D["star"]))
    open(os.path.join(pd, "pattern-light.svg"), "w").write(pattern(L["background"], L["border-subtle-00"], L["star"]))
    open(os.path.join(sd, "pklnx-og-image.svg"), "w").write(social(1200, 630, 104, 96, 210, 30, 72))
    open(os.path.join(sd, "pklnx-banner.svg"), "w").write(social(1280, 320, 64, 80, 72, 22, 44))
    for product, description in PRODUCT_SOCIAL.items():
        open(os.path.join(sd, f"{product}-social.svg"), "w").write(product_social(product, description))


if __name__ == "__main__":
    main()
