"""Pattern tiles and social images, built from the logo geometry and IBM Plex Mono.

Writes project/assets/Patterns/*.svg and project/assets/Social/*.svg. Text is converted
to paths, so the files render anywhere without fonts. Run after build_logo.py.
"""
import json
import os
from build_logo import glyph_path, fmt, ROOT, FONTS
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


def main():
    pd = os.path.join(ROOT, "project/assets/Patterns")
    sd = os.path.join(ROOT, "project/assets/Social")
    os.makedirs(pd, exist_ok=True)
    os.makedirs(sd, exist_ok=True)
    open(os.path.join(pd, "pattern-dark.svg"), "w").write(pattern(D["background"], D["border-subtle-00"], D["star"]))
    open(os.path.join(pd, "pattern-light.svg"), "w").write(pattern(L["background"], L["border-subtle-00"], L["star"]))
    open(os.path.join(sd, "pklnx-og-image.svg"), "w").write(social(1200, 630, 104, 96, 210, 30, 72))
    open(os.path.join(sd, "pklnx-banner.svg"), "w").write(social(1280, 320, 64, 80, 72, 22, 44))


if __name__ == "__main__":
    main()
