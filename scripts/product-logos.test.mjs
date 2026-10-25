// Tests of the product logos, icons and social images (design-system #10, part 2):
// the generated files in project/assets/Logos/products and project/assets/Social, their
// PNGs and manifest, and the reference geometry from issue #12.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { decodeRGBA, ihdr, textChunks } from './png.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIR = 'project/assets/Logos/products';
const SOCIAL = 'project/assets/Social';
const PRODUCTS = ['mail-archive', 'paperless-go'];
const read = (p) => readFileSync(path.join(ROOT, p));
const readText = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const brand = JSON.parse(readText('theme/brand.json')).logo;
const tokens = JSON.parse(readText('theme/tokens.json'));

// The naming rule of products/: SVG kinds, and PNG name → [size, source SVG kind].
const THEMES = ['dark', 'light', 'black', 'white'];
const SVG_KINDS = [...THEMES.map((t) => `mark-${t}`), ...THEMES.map((t) => `lockup-${t}`), 'tile', 'apple-touch-icon', 'icon-maskable'];
const PNG_KINDS = {
  'favicon-32': [32, 'tile'],
  'icon-192': [192, 'tile'],
  'icon-512': [512, 'tile'],
  'apple-touch-icon': [180, 'apple-touch-icon'],
  'icon-maskable-512': [512, 'icon-maskable'],
};
const SOCIAL_SIZE = [1280, 640];

// Every PNG the manifest must list: path → { width, height, source }.
const EXPECTED_PNGS = Object.fromEntries(
  PRODUCTS.flatMap((p) => [
    ...Object.entries(PNG_KINDS).map(([kind, [size, src]]) => [
      `${DIR}/${p}-${kind}.png`,
      { width: size, height: size, source: `${DIR}/${p}-${src}.svg` },
    ]),
    [`${SOCIAL}/${p}-social.png`, { width: SOCIAL_SIZE[0], height: SOCIAL_SIZE[1], source: `${SOCIAL}/${p}-social.svg` }],
  ]),
);

const manifest = JSON.parse(readText(`${DIR}/manifest.json`));
const productSvgs = PRODUCTS.flatMap((p) => SVG_KINDS.map((k) => `${DIR}/${p}-${k}.svg`));
const socialSvgs = PRODUCTS.map((p) => `${SOCIAL}/${p}-social.svg`);

// The reference geometry from https://github.com/pklnx/design-system/issues/12#issuecomment-6374484974.
const REFERENCE = {
  'mail-archive': [
    ['M3.5 13.5 L60.5 13.5 L60.5 20.5 L3.5 20.5 Z', null],
    ['M7.5 24.5 L7.5 54.5 L56.5 54.5 L56.5 24.5 L49.5 24.5 L49.5 47.5 L14.5 47.5 L14.5 24.5 Z', null],
    ['M30.8 25 L33.2 25 L35.4 31.6 L42 33.8 L42 36.2 L35.4 38.4 L33.2 45 L30.8 45 L28.6 38.4 L22 36.2 L22 33.8 L28.6 31.6 Z', 'star'],
  ],
  'paperless-go': [
    ['M11 5 L41 5 L53 17 L53 59 L11 59 Z M18 12 L34 12 L34 24 L46 24 L46 52 L18 52 Z', 'evenodd'],
    ['M30.86 28.5 L33.14 28.5 L35.23 34.77 L41.5 36.86 L41.5 39.14 L35.23 41.23 L33.14 47.5 L30.86 47.5 L28.77 41.23 L22.5 39.14 L22.5 36.86 L28.77 34.77 Z', 'star'],
  ],
};
const MARK_BBOX = { 'mail-archive': [3.5, 13.5, 60.5, 54.5], 'paperless-go': [11, 5, 53, 59] };

const paths = (svg) => [...svg.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({
  fill: /fill="([^"]*)"/.exec(m[1])?.[1],
  rule: /fill-rule="([^"]*)"/.exec(m[1])?.[1] ?? null,
  d: /\sd="([^"]*)"/.exec(` ${m[1]}`)?.[1],
}));
const viewBox = (svg) => /viewBox="([^"]*)"/.exec(svg)[1].split(' ').map(Number);
const colours = (svg) => new Set([...svg.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()));

// Absolute x coordinates of an SVG path as written by fontTools' SVGPathPen and fmt():
// M, L, H, V, Q, C, Z, numbers separated by spaces or signs.
function pathXs(d) {
  const xs = [];
  const tokens = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g);
  let cmd = null;
  let args = [];
  const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, Z: 0 };
  for (const t of tokens) {
    if (/[A-Z]/.test(t)) { cmd = t; args = []; continue; }
    args.push(Number(t));
    if (args.length === arity[cmd]) {
      if (cmd === 'H') xs.push(args[0]);
      else if (cmd !== 'V') for (let i = 0; i < args.length; i += 2) xs.push(args[i]);
      args = [];
    }
  }
  return xs;
}

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const relLum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test('products/ holds exactly the SVGs of the naming rule, the manifest PNGs, manifest.json and README.md', () => {
  const pngs = Object.keys(EXPECTED_PNGS).filter((p) => p.startsWith(`${DIR}/`));
  const want = [...productSvgs, ...pngs, `${DIR}/manifest.json`, `${DIR}/README.md`].map((p) => path.basename(p)).sort();
  assert.deepEqual(readdirSync(path.join(ROOT, DIR)).sort(), want);
});

test('the manifest lists exactly the expected PNGs with their sources and sizes', () => {
  const listed = Object.fromEntries(manifest.pngs.map((e) => [e.path, { width: e.width, height: e.height, source: e.source }]));
  assert.equal(manifest.pngs.length, Object.keys(listed).length, 'a PNG is listed twice');
  assert.deepEqual(listed, EXPECTED_PNGS);
  assert.match(manifest.renderer, /^@resvg\/resvg-js 2\.6\.2$/);
});

test('every manifest PNG exists, has its size, and was rendered from the current SVG', () => {
  for (const e of manifest.pngs) {
    assert.ok(existsSync(path.join(ROOT, e.path)), `missing: ${e.path}`);
    const png = read(e.path);
    const h = ihdr(png);
    assert.deepEqual([h.width, h.height], [e.width, e.height], `${e.path}: IHDR size`);
    const named = /-(\d+)\.png$/.exec(e.path);
    if (named) assert.equal(h.width, Number(named[1]), `${e.path}: size in the file name`);
    const svgSha = sha256(read(e.source));
    assert.equal(textChunks(png)['pklnx:source-sha256'], svgSha, `${e.path} is stale: render it again (node scripts/render_pngs.mjs)`);
    assert.equal(e.sourceSha256, svgSha, `${e.path}: manifest source sha256`);
    assert.equal(sha256(png), e.sha256, `${e.path}: manifest sha256`);
  }
});

test('the marks reproduce the reference geometry of #12 exactly, in every file that holds them', () => {
  for (const p of PRODUCTS) {
    for (const k of SVG_KINDS) {
      const svg = readText(`${DIR}/${p}-${k}.svg`);
      const mark = paths(svg).slice(0, REFERENCE[p].length);
      assert.deepEqual(mark.map((x) => x.d), REFERENCE[p].map(([d]) => d), `${p}-${k}: mark paths`);
      assert.deepEqual(mark.map((x) => x.rule), REFERENCE[p].map(([, r]) => (r === 'evenodd' ? 'evenodd' : null)), `${p}-${k}: fill rules`);
    }
    // The social image holds the dark lockup.
    const social = readText(`${SOCIAL}/${p}-social.svg`);
    for (const [d] of REFERENCE[p]) assert.ok(social.includes(`d="${d}"`), `${p}-social: mark path`);
  }
});

test('lockups: mark stroke = SemiBold stem, mark box centred on the cap height, tight viewBox', () => {
  for (const p of PRODUCTS) {
    for (const t of THEMES) {
      const svg = readText(`${DIR}/${p}-lockup-${t}.svg`);
      const m = /<g transform="translate\(0 (-?[\d.]+)\) scale\(([\d.]+)\)">/.exec(svg);
      assert.ok(m, `${p}-lockup-${t}: mark group`);
      const [ty, k] = [Number(m[1]), Number(m[2])];
      assert.ok(Math.abs(k * 7 - 12.8) < 0.001, `${p}-lockup-${t}: stroke ${k * 7}`);
      assert.equal(ty, -93.41);
      const [x, y, w, h] = viewBox(svg);
      const [x0, y0, x1, y1] = MARK_BBOX[p];
      // The viewBox starts at the mark's left edge and contains the whole mark.
      assert.ok(Math.abs(x - x0 * k) <= 0.01, `${p}-lockup-${t}: viewBox x ${x}`);
      assert.ok(y <= ty + y0 * k + 0.001 && y + h >= ty + y1 * k - 0.001, `${p}-lockup-${t}: mark vertically inside`);
      // The name ends at the viewBox's right edge.
      const name = paths(svg).at(-1);
      assert.ok(Math.abs(Math.max(...pathXs(name.d)) - (x + w)) <= 0.01, `${p}-lockup-${t}: right edge`);
      assert.ok(Math.min(...pathXs(name.d)) > x1 * k, `${p}-lockup-${t}: name right of the mark`);
    }
  }
});

test('SVG hygiene: viewBox and title; no text, style, script, links, strokes or embedded images', () => {
  for (const f of [...productSvgs, ...socialSvgs]) {
    const svg = readText(f);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[^"]+"/, `${f}: viewBox`);
    assert.match(svg, /<title>[^<]+<\/title>/, `${f}: title`);
    for (const bad of ['<text', '<style', '<script', 'href', '<image', 'url(', 'stroke', '<foreignObject', 'font']) {
      assert.ok(!svg.toLowerCase().includes(bad.toLowerCase()), `${f} contains ${bad}`);
    }
  }
});

test('marks, tiles, lockups and icon sources use only the brand.json logo colours (black or white in single colour)', () => {
  const d = brand.dark;
  const l = brand.light;
  const allowed = {
    'mark-dark': [d.ink, d.star], 'lockup-dark': [d.ink, d.star],
    'mark-light': [l.ink, l.star], 'lockup-light': [l.ink, l.star],
    'mark-black': ['#000000'], 'lockup-black': ['#000000'],
    'mark-white': ['#ffffff'], 'lockup-white': ['#ffffff'],
    tile: [d.ground, d.ink, d.star], 'apple-touch-icon': [d.ground, d.ink, d.star], 'icon-maskable': [d.ground, d.ink, d.star],
  };
  for (const p of PRODUCTS) {
    for (const k of SVG_KINDS) {
      const svg = readText(`${DIR}/${p}-${k}.svg`);
      assert.deepEqual([...colours(svg)].sort(), [...new Set(allowed[k])].sort(), `${p}-${k}: colours`);
      // The star is the last path and carries the star colour (or the single colour).
      const star = paths(svg).slice(0, REFERENCE[p].length).at(-1);
      const starColour = k.endsWith('-light') ? l.star : k.endsWith('-black') ? '#000000' : k.endsWith('-white') ? '#ffffff' : d.star;
      assert.equal(star.fill, starColour, `${p}-${k}: star colour`);
    }
  }
});

test('the social SVGs use only background, border-subtle-00, text-primary, text-secondary and star (G100)', () => {
  const D = tokens.dark;
  const allowed = new Set(['background', 'border-subtle-00', 'text-primary', 'text-secondary', 'star'].map((t) => D[t].toLowerCase()));
  for (const f of socialSvgs) {
    const used = colours(readText(f));
    for (const c of used) assert.ok(allowed.has(c), `${f}: ${c} is not an allowed token colour`);
    assert.ok(used.has(D['text-secondary'].toLowerCase()) && used.has(D.star.toLowerCase()), `${f}: description and star`);
  }
});

test('the star contrasts at least 3:1 with its ground in both themes', () => {
  for (const t of ['dark', 'light']) {
    const c = contrast(brand[t].star, brand[t].ground);
    assert.ok(c >= 3, `${t}: star ${brand[t].star} on ${brand[t].ground} is ${c.toFixed(2)}`);
  }
});

test('maskable icons: the mark lies inside the safe circle (r 204.8) and its bounding box is centred', () => {
  const ground = brand.dark.ground;
  const g = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  for (const p of PRODUCTS) {
    const { width, height, data } = decodeRGBA(read(`${DIR}/${p}-icon-maskable-512.png`));
    assert.deepEqual([width, height], [512, 512]);
    let [minX, minY, maxX, maxY, n] = [Infinity, Infinity, -Infinity, -Infinity, 0];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i] === g[0] && data[i + 1] === g[1] && data[i + 2] === g[2] && data[i + 3] === 255) continue;
        n++;
        const r = Math.hypot(x + 0.5 - 256, y + 0.5 - 256);
        assert.ok(r <= 204.8, `${p}: pixel (${x}, ${y}) at radius ${r.toFixed(1)} is outside the safe circle`);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    assert.ok(n > 10000, `${p}: the mark is missing (${n} pixels)`);
    const cx = (minX + maxX + 1) / 2;
    const cy = (minY + maxY + 1) / 2;
    assert.ok(Math.abs(cx - 256) <= 2 && Math.abs(cy - 256) <= 2, `${p}: bounding box centre (${cx}, ${cy})`);
  }
});

test('social images: the description starts at x 96 with the lockup, wraps balanced, and stays inside the margin', () => {
  const cell = 0.6 * 28; // Plex Mono advance at 28 px
  for (const p of PRODUCTS) {
    const svg = readText(`${SOCIAL}/${p}-social.svg`);
    assert.deepEqual(viewBox(svg), [0, 0, 1280, 640]);
    // The lockup's left edge (its viewBox x, scaled) sits at x 96.
    const lockupVb = viewBox(readText(`${DIR}/${p}-lockup-dark.svg`));
    const lg = /<g transform="translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)"><g transform="translate\(0 /.exec(svg);
    assert.ok(lg, `${p}: lockup group`);
    assert.ok(Math.abs(Number(lg[1]) + lockupVb[0] * Number(lg[3]) - 96) <= 0.01, `${p}: lockup left edge`);
    // The description: one translated group per line, in text-secondary, no scale.
    const lines = [...svg.matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)"><path fill="([^"]+)" d="([^"]+)"\/><\/g>/g)]
      .filter((m) => m[3].toLowerCase() === tokens.dark['text-secondary'].toLowerCase());
    assert.equal(lines.length, 2, `${p}: two description lines`);
    const ends = [];
    for (const [, x, , , d] of lines) {
      assert.equal(Number(x), 96, `${p}: description x`);
      const right = 96 + Math.max(...pathXs(d));
      assert.ok(right <= 1216, `${p}: a description line ends at ${right.toFixed(1)}, past 1216`);
      assert.ok(right - 96 <= 64 * cell, `${p}: a line is longer than 64 characters`);
      ends.push(right - 96);
    }
    assert.equal(Number(lines[1][2]) - Number(lines[0][2]), 40, `${p}: line height`);
    // Balanced: the shorter line is at least 3/4 of the longer, so no lone "web UI." line.
    assert.ok(Math.min(...ends) >= 0.75 * Math.max(...ends), `${p}: unbalanced wrap (${ends.map((e) => e.toFixed(0)).join(' / ')} px)`);
  }
});

test('social images: nothing brighter than the dot grid lies outside x 64-1216, y 48-592', () => {
  for (const p of PRODUCTS) {
    const { width, height, data } = decodeRGBA(read(`${SOCIAL}/${p}-social.png`));
    assert.deepEqual([width, height], SOCIAL_SIZE);
    let bright = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (luminance(data[i], data[i + 1], data[i + 2]) <= 100) continue;
        bright++;
        assert.ok(x >= 64 && x < 1216 && y >= 48 && y < 592, `${p}: bright pixel at (${x}, ${y})`);
      }
    }
    assert.ok(bright > 5000, `${p}: lockup and text are missing (${bright} bright pixels)`);
  }
});

// Renders an SVG at 16 px with resvg and returns the luminance of each pixel, times alpha.
function lum16(file) {
  const img = new Resvg(readText(file), { fitTo: { mode: 'width', value: 16 }, font: { loadSystemFonts: false } }).render();
  assert.deepEqual([img.width, img.height], [16, 16]);
  const px = img.pixels;
  return Array.from({ length: 256 }, (_, i) => luminance(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) * (px[i * 4 + 3] / 255));
}
const rowMean = (L, y) => L.slice(y * 16 + 2, y * 16 + 14).reduce((a, b) => a + b, 0) / 12;
test('tiles and touch icons: the mark keeps 7 units of clear space, centred, at one scale for all products (#16)', () => {
  const CLEAR = 7;
  const scales = new Set();
  const ground = [1, 3, 5].map((i) => parseInt(brand.dark.ground.slice(i, i + 2), 16));
  for (const p of PRODUCTS) {
    for (const k of ['tile', 'apple-touch-icon']) {
      const svg = readText(`${DIR}/${p}-${k}.svg`);
      const m = /<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">/.exec(svg);
      assert.ok(m, `${p}-${k}: the mark sits in a translate/scale group`);
      const [tx, ty, s] = m.slice(1).map(Number);
      scales.add(s);
      const [x0, y0, x1, y1] = MARK_BBOX[p];
      const sides = [tx + x0 * s, ty + y0 * s, 64 - tx - x1 * s, 64 - ty - y1 * s];
      for (const side of sides) assert.ok(side >= CLEAR, `${p}-${k}: ${side} units of clear space`);
      assert.ok(Math.abs(sides[0] - sides[2]) < 1e-9 && Math.abs(sides[1] - sides[3]) < 1e-9, `${p}-${k}: not centred (${sides})`);
    }
  }
  assert.equal(scales.size, 1, `one scale for all tiles and touch icons: ${[...scales]}`);
  // The rendered PNGs: no ink in the clear-space band (a pixel that straddles its edge is allowed).
  for (const [kind, [size, src]] of Object.entries(PNG_KINDS)) {
    if (src === 'icon-maskable') continue;
    const band = (CLEAR * size) / 64;
    for (const p of PRODUCTS) {
      const { width, height, data } = decodeRGBA(read(`${DIR}/${p}-${kind}.png`));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] < 255 || (data[i] === ground[0] && data[i + 1] === ground[1] && data[i + 2] === ground[2])) continue;
          const inside = x + 1 > Math.floor(band) && x < Math.ceil(size - band) && y + 1 > Math.floor(band) && y < Math.ceil(size - band);
          assert.ok(inside, `${p}-${kind}: ink at (${x}, ${y}) in the ${band.toFixed(1)} px clear space`);
        }
      }
    }
  }
});

function difference(a, b) {
  let n = 0;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > 64) n++;
  }
  return { n, mean: sum / 256 };
}

test('16 px: mail-archive keeps its lid and differs from pklnx-favicon.svg (thresholds from #12)', () => {
  const mail = lum16(`${DIR}/mail-archive-tile.svg`);
  const pklnx = lum16('project/assets/Logos/pklnx-favicon.svg');
  const lid = rowMean(mail, 4);
  const gap = rowMean(mail, 5);
  assert.ok(lid >= 200, `lid row 4: ${lid.toFixed(1)}`);
  assert.ok(gap <= 100, `gap row 5: ${gap.toFixed(1)}`);
  assert.ok(lid - gap >= 100, `lid minus gap: ${(lid - gap).toFixed(1)}`);
  assert.ok(rowMean(pklnx, 4) <= 100, `pklnx row 4: ${rowMean(pklnx, 4).toFixed(1)}`);
  const d = difference(mail, pklnx);
  assert.ok(d.n >= 48, `${d.n} pixels differ by more than 64 levels`);
  assert.ok(d.mean >= 30, `mean difference ${d.mean.toFixed(1)}`);
});

test('16 px: paperless-go differs from pklnx-favicon.svg and from mail-archive', () => {
  const paper = lum16(`${DIR}/paperless-go-tile.svg`);
  for (const other of ['project/assets/Logos/pklnx-favicon.svg', `${DIR}/mail-archive-tile.svg`]) {
    const d = difference(paper, lum16(other));
    assert.ok(d.n >= 48, `against ${other}: ${d.n} pixels differ by more than 64 levels`);
    assert.ok(d.mean >= 30, `against ${other}: mean difference ${d.mean.toFixed(1)}`);
  }
});

test('requirements-logo.txt pins exact versions with hashes only', () => {
  const text = readText('scripts/requirements-logo.txt');
  const reqs = text.replace(/\\\n/g, ' ').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.deepEqual(reqs.map((l) => l.split(' ')[0]).sort(), ['brotli==1.2.1', 'fonttools==4.67.0']);
  for (const l of reqs) {
    const hashes = l.match(/--hash=sha256:[0-9a-f]{64}/g) ?? [];
    assert.ok(hashes.length > 0, `${l.split(' ')[0]}: no hashes`);
    assert.equal(l.trim().split(/\s+/).length, 1 + hashes.length, `${l.split(' ')[0]}: something besides hashes`);
  }
});

test('CI regenerates the logos with pinned Python and hashed requirements, then checks the tree', () => {
  const ci = readText('.github/workflows/ci.yml');
  const step = /- uses: actions\/setup-python@([0-9a-f]{40}) # v[\d.]+\n\s+with:\n\s+python-version: '3\.13'\n\n\s+- name: Logos are generated\n([\s\S]*?)(?=\n\s+- (?:name|uses):)/.exec(ci);
  assert.ok(step, 'setup-python pinned by SHA with python-version 3.13, then the step "Logos are generated"');
  const body = step[2];
  const order = [
    'pip install --require-hashes --only-binary :all: -r scripts/requirements-logo.txt',
    'python3 scripts/build_logo.py',
    'python3 scripts/build_product_logos.py',
    'python3 scripts/build_assets.py',
    'node scripts/render_pngs.mjs',
    'git status --porcelain',
  ].map((c) => body.indexOf(c));
  assert.ok(order.every((i) => i >= 0), 'a command is missing from the step');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the commands are out of order');
});
