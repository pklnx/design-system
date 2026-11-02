// The brand values live in one place each: the colours in theme/brand.json, the star and
// wordmark geometry in theme/logo-geometry.json (written by scripts/build_logo.py). Every
// built asset and the component bundle must carry exactly those values, and no build script
// or source file may carry a copy of its own (design-system #23).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const brand = JSON.parse(read('theme/brand.json')).logo;
const geo = JSON.parse(read('theme/logo-geometry.json'));
const tokens = JSON.parse(read('theme/tokens.json'));

const LOGOS = 'project/assets/Logos';
const ICONS = 'project/assets/Icons';

// The <path> elements of an SVG as [{ fill, d }], in document order.
const paths = (svg) => [...svg.matchAll(/<path ([^>]*)\/>/g)].map((m) => ({
  fill: /fill="([^"]*)"/.exec(m[1])?.[1],
  d: /\sd="([^"]*)"/.exec(` ${m[1]}`)?.[1],
}));
const attr = (svg, tag, name) => new RegExp(`<${tag} [^>]*\\b${name}="([^"]*)"`).exec(svg)?.[1];

test('theme/logo-geometry.json has the word, the mark and the icon star', () => {
  for (const g of ['word', 'mark', 'icon']) {
    assert.match(geo[g].star, /^M[\d. -]+( L[\d. -]+)* Z$/, `${g}.star is a path`);
    assert.match(geo[g].viewBox, /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/, `${g}.viewBox`);
  }
});

test('the wordmark SVGs carry the word geometry; the colour variants the brand.json colours', () => {
  const colours = { dark: [brand.dark.ink, brand.dark.star], light: [brand.light.ink, brand.light.star], black: ['#000000', '#000000'], white: ['#ffffff', '#ffffff'] };
  for (const [variant, [ink, star]] of Object.entries(colours)) {
    const file = `${LOGOS}/pklnx-wordmark-${variant}.svg`;
    const svg = read(file);
    assert.deepEqual(paths(svg), [
      { fill: ink, d: geo.word.text }, { fill: star, d: geo.word.star }, { fill: ink, d: geo.word.bracket },
    ], file);
    assert.equal(attr(svg, 'svg', 'viewBox'), geo.word.viewBox, `${file}: viewBox`);
  }
});

test('the mark, favicon and avatar SVGs carry the mark geometry and the brand.json colours', () => {
  const marks = {
    'pklnx-mark-dark': [brand.dark.ink, brand.dark.star],
    'pklnx-mark-light': [brand.light.ink, brand.light.star],
    'pklnx-mark-black': ['#000000', '#000000'],
    'pklnx-mark-white': ['#ffffff', '#ffffff'],
    'pklnx-favicon': [brand.dark.ink, brand.dark.star],
    'pklnx-avatar': [brand.dark.ink, brand.dark.star],
  };
  for (const [name, [ink, star]] of Object.entries(marks)) {
    const file = `${LOGOS}/${name}.svg`;
    assert.deepEqual(paths(read(file)), [{ fill: ink, d: geo.mark.bracket }, { fill: star, d: geo.mark.star }], file);
  }
  assert.equal(attr(read(`${LOGOS}/pklnx-favicon.svg`), 'rect', 'fill'), brand.dark.ground, 'favicon ground');
  assert.equal(attr(read(`${LOGOS}/pklnx-avatar.svg`), 'circle', 'fill'), brand.dark.ground, 'avatar ground');
});

test('the pattern, og image, banner and product social images carry the star of the geometry in the brand.json colour', () => {
  const social = ['pklnx-og-image', 'pklnx-banner', 'mail-archive-social', 'paperless-go-social'].map((n) => [`project/assets/Social/${n}.svg`, geo.word.star]);
  const patterns = [['dark', brand.dark.star], ['light', brand.light.star]].map(([t, c]) => [`project/assets/Patterns/pattern-${t}.svg`, geo.mark.star, c]);
  for (const [file, star, colour = brand.dark.star] of [...social, ...patterns]) {
    const stars = paths(read(file)).filter((p) => p.d === star);
    assert.ok(stars.length > 0, `${file}: has the star path from theme/logo-geometry.json`);
    assert.ok(stars.some((p) => p.fill === colour), `${file}: a star path in ${colour}`);
  }
});

test('Icons/star.svg is the icon star of the geometry in the light star colour; the other icons use the light ink', () => {
  const star = read(`${ICONS}/star.svg`);
  assert.deepEqual(paths(star), [{ fill: brand.light.star, d: geo.icon.star }]);
  assert.equal(attr(star, 'svg', 'viewBox'), geo.icon.viewBox);
  const icons = readdirSync(path.join(ROOT, ICONS)).filter((f) => f.endsWith('.svg') && f !== 'star.svg');
  assert.ok(icons.length >= 14, `${icons.length} icons`);
  for (const f of icons) {
    const fills = [...read(`${ICONS}/${f}`).matchAll(/fill="([^"]*)"/g)].map((m) => m[1]).filter((v) => v !== 'none');
    assert.ok(fills.length > 0 && fills.every((v) => v === brand.light.ink), `${f}: fills ${fills} are ${brand.light.ink}`);
  }
});

test('the G100 and White star tokens are the brand.json star colours', () => {
  assert.equal(tokens.dark.star, brand.dark.star);
  assert.equal(tokens.light.star, brand.light.star);
});

test('the component bundle carries the geometry of theme/logo-geometry.json (Logo and Icon)', () => {
  const bundle = read('project/components/bundle.js');
  for (const [name, value] of Object.entries({ 'word.text': geo.word.text, 'word.star': geo.word.star, 'word.bracket': geo.word.bracket, 'mark.star': geo.mark.star, 'icon.star': geo.icon.star })) {
    assert.ok(bundle.includes(JSON.stringify(value)), `bundle.js carries ${name}`);
  }
});

// The sources: build scripts and src/ read the values, they do not spell them out. The one
// writer of the geometry, scripts/build_logo.py, is the origin of its shapes (the mark's
// bracket is drawn there by hand), but it reads the colours like everyone else. Tests are not
// scanned: they compare against the files above, and the products' own marks are reference
// values from issue #12.
test('no build script or source file spells out a star colour or a path of theme/logo-geometry.json', () => {
  const walk = (dir) => readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['fixtures', '__pycache__'].includes(e.name) ? [] : walk(`${dir}/${e.name}`)) : [`${dir}/${e.name}`]));
  const files = [...walk('scripts'), ...walk('src')].filter((f) => /\.(mjs|py|jsx|css|scss)$/.test(f) && !/\.test\.mjs$/.test(f));
  for (const f of ['scripts/build_icons.mjs', 'src/components.jsx', 'scripts/build_logo.py', 'scripts/build_assets.py']) assert.ok(files.includes(f), `${f} is scanned`);
  const colours = [brand.dark.star, brand.light.star];
  const shapes = [geo.word.star, geo.word.bracket, geo.mark.bracket, geo.mark.star, geo.icon.star];
  for (const f of files) {
    const text = read(f).toLowerCase();
    for (const v of f === 'scripts/build_logo.py' ? colours : [...colours, ...shapes]) {
      assert.ok(!text.includes(v.toLowerCase()), `${f} carries its own copy of ${v.slice(0, 30)}`);
    }
  }
});
