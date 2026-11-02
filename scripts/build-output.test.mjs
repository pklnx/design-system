// Tests of what the build scripts write (design-system #28): the documentation site
// (build_site.mjs), the Carbon icon SVGs (build_icons.mjs), the usage notes (token-notes.mjs)
// and the committed pklnx wordmark and pattern SVGs (build_logo.py, build_assets.py).
//
// The scripts run into a temp directory (their optional output-dir argument), so the checkout
// stays untouched. No network, no Chromium. The expected lists come from the sources the scripts
// read or from independent files (the component directories, the asset index, the IconName
// declaration), never from the script under test.
// Complements script-robustness.test.mjs (runs the scripts in a path with a space) and
// design-system-index.test.mjs (the asset index against the files).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { exact, prefix, noteFor } from './token-notes.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const files = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A fresh output directory, removed at the end of the test.
function tempDir(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pklnx-out-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function runScript(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script), ...args], { encoding: 'utf8', timeout: 120000 });
  assert.equal(r.status, 0, `${script}: ${r.stderr}`);
  return r;
}

// ------------------------------------------------------------------ the documentation site

const index = json('project/design-system.json');
// Every directory of project/components with a preview.html is a component; Cover is the
// overview's banner and has a preview but no page of its own.
const previewDirs = readdirSync(path.join(ROOT, 'project/components'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(path.join(ROOT, 'project/components', e.name, 'preview.html')))
  .map((e) => e.name).sort();
const componentPages = previewDirs.filter((n) => n !== 'Cover');

test('build_site.mjs: the pages, the previews and the static files are written', (t) => {
  const out = tempDir(t);
  const r = runScript('build_site.mjs', [out]);
  assert.match(r.stdout, new RegExp(`site ${componentPages.length} components, \\d+ assets`));

  assert.ok(componentPages.length >= 10, 'the component list must not be empty by accident');
  for (const page of ['index', 'colors', 'typography', 'spacing', 'assets']) {
    assert.ok(existsSync(path.join(out, `${page}.html`)), `${page}.html`);
  }
  for (const name of componentPages) assert.ok(existsSync(path.join(out, 'components', `${name}.html`)), `components/${name}.html`);
  // components/ also holds bundle.css and bundle.js, which the previews load.
  assert.deepEqual(files(path.join(out, 'components')).filter((f) => f.endsWith('.html')), componentPages.map((n) => `${n}.html`));
  // Every preview, Cover included; a page embeds its preview, so a missing file is an empty frame.
  assert.deepEqual(files(path.join(out, 'preview')), previewDirs.map((n) => `${n}.html`));
  for (const name of componentPages) {
    assert.match(readFileSync(path.join(out, 'components', `${name}.html`), 'utf8'), new RegExp(`src="\\.\\./preview/${name}\\.html"`), `${name}: iframe`);
  }
  // The sidebar of every page links to the five pages and to every component page.
  const fixed = ['index', 'colors', 'typography', 'spacing', 'assets'];
  for (const file of [...fixed.map((p) => `${p}.html`), ...componentPages.map((n) => `components/${n}.html`)]) {
    const text = readFileSync(path.join(out, file), 'utf8');
    const up = file.includes('/') ? '../' : '';
    for (const p of fixed) assert.ok(text.includes(`href="${up}${p}.html"`), `${file}: no link to ${p}.html`);
    for (const n of componentPages) assert.ok(text.includes(`href="${up}components/${n}.html"`), `${file}: no link to components/${n}.html`);
  }
  for (const f of ['tokens.css', 'site.css', 'favicon.svg', '.nojekyll', 'THIRD_PARTY_NOTICES.txt', 'components/bundle.css', 'components/bundle.js',
    'lib/react.production.min.js', 'lib/react-dom.production.min.js', 'theme/pklnx-carbon.css']) {
    assert.ok(existsSync(path.join(out, f)), f);
  }
  assert.deepEqual(files(path.join(out, 'fonts')), files(path.join(ROOT, 'project/fonts')));
});

test('build_site.mjs: the assets page names and ships every indexed asset', (t) => {
  const out = tempDir(t);
  runScript('build_site.mjs', [out]);
  const page = readFileSync(path.join(out, 'assets.html'), 'utf8');
  let count = 0;
  for (const group of index.groups) {
    assert.ok(page.includes(`<h2 class="group-title">${escHtml(group)}</h2>`), `${group}: heading`);
    for (const name of Object.keys(index.assetGroups[group].files)) {
      count += 1;
      assert.ok(page.includes(`href="assets/${escHtml(group)}/${escHtml(name)}" download>${escHtml(name)}</a>`), `${group}/${name} is not listed on the assets page`);
      assert.deepEqual(readFileSync(path.join(out, 'assets', group, name)), readFileSync(path.join(ROOT, 'project/assets', group, name)), `${group}/${name}: copy`);
    }
  }
  assert.ok(count > 0);
});

test('build_site.mjs: no page or preview links to a file that is not in the site', (t) => {
  const out = tempDir(t);
  runScript('build_site.mjs', [out]);
  const html = walk(out).filter((f) => f.endsWith('.html'));
  assert.ok(html.length >= 5 + 2 * componentPages.length);
  for (const file of html) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\/_blob\//, `${path.relative(out, file)}: a claude.ai /_blob/ link that no indexed asset maps`);
    for (const [, url] of text.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(url)) continue; // https:, data:, mailto:, fragments, absolute paths
      const target = path.resolve(path.dirname(file), decodeURI(url.split(/[?#]/)[0].replaceAll('&amp;', '&')));
      assert.ok(existsSync(target), `${path.relative(out, file)} links to ${url}, which the site does not contain`);
    }
  }
});

test('build_site.mjs: can run twice into one directory', (t) => {
  const out = tempDir(t);
  runScript('build_site.mjs', [out]);
  writeFileSync(path.join(out, 'stale.txt'), 'left over from an earlier build');
  runScript('build_site.mjs', [out]);
  assert.ok(!existsSync(path.join(out, 'stale.txt')), 'the output directory is emptied first');
  assert.ok(existsSync(path.join(out, 'index.html')));
});

// The script empties its output directory, so this test never points it at the real checkout:
// the script runs from a throw-away "checkout" (only the script, in scripts/) and is given
// that directory and its parent. If the guard is gone, only the temp directories are emptied.
test('build_site.mjs: refuses an output directory that contains the checkout', (t) => {
  const base = tempDir(t);
  const checkout = path.join(base, 'checkout');
  mkdirSync(path.join(checkout, 'scripts'), { recursive: true });
  cpSync(path.join(ROOT, 'scripts/build_site.mjs'), path.join(checkout, 'scripts/build_site.mjs'));
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(checkout, 'node_modules'));
  writeFileSync(path.join(base, 'keep.txt'), 'x');
  for (const dir of [checkout, base]) {
    const r = spawnSync(process.execPath, [path.join(checkout, 'scripts/build_site.mjs'), dir], { encoding: 'utf8', timeout: 120000 });
    assert.notEqual(r.status, 0, dir);
    assert.match(r.stderr, /refusing to empty/, dir);
    assert.ok(existsSync(path.join(checkout, 'scripts/build_site.mjs')) && existsSync(path.join(base, 'keep.txt')), `${dir} was emptied`);
  }
});

// ------------------------------------------------------------------ the icon SVGs

// The icon list: IconName in the declarations (components-types.test.mjs ties it to ICONS in components.jsx).
const iconNames = [...(/^export type IconName = ([^;]*);/m.exec(read('project/components/index.d.ts'))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

test('build_icons.mjs: writes exactly one well-formed SVG per icon name', (t) => {
  const out = tempDir(t);
  const r = runScript('build_icons.mjs', [out]);
  assert.ok(iconNames.includes('star') && iconNames.length >= 10);
  assert.deepEqual(files(out), iconNames.map((n) => `${n}.svg`));
  assert.match(r.stdout, new RegExp(`icons ${iconNames.length}\\b`));
  for (const name of iconNames) {
    const svg = readFileSync(path.join(out, `${name}.svg`), 'utf8');
    assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, name);
    assert.match(svg, /<\/svg>\n$/, name);
    assert.match(svg, /\bviewBox="0 0 (?:24|32) (?:24|32)"/, name);
    assert.ok(/<path\b/.test(svg), `${name}: no path`);
    assert.doesNotMatch(svg, /currentColor|aria-hidden/, `${name}: build_icons.mjs replaces currentColor by a fixed color and drops aria-hidden`);
    const png = new Resvg(svg).render(); // throws on malformed SVG
    assert.ok(png.width > 0 && png.height > 0, name);
  }
});

test('the committed icon SVGs are what build_icons.mjs writes', (t) => {
  const out = tempDir(t);
  runScript('build_icons.mjs', [out]);
  const committed = path.join(ROOT, 'project/assets/Icons');
  assert.deepEqual(files(committed).filter((f) => f !== 'README.md'), files(out));
  for (const f of files(out)) assert.equal(read(`project/assets/Icons/${f}`), readFileSync(path.join(out, f), 'utf8'), `${f} is stale: run npm run build:all`);
});

// ------------------------------------------------------------------ token-notes.mjs

const colorTokens = json('project/tokens.json').color.tokens.map((x) => x.name);

test('token-notes: every exact note names a token and reads as one sentence', () => {
  for (const [name, note] of Object.entries(exact)) {
    assert.ok(colorTokens.includes(name), `${name}: not a color token of project/tokens.json`);
    assert.match(note, /^[A-Z`].*[.)`]$/, `${name}: a note starts with a capital letter and ends with a full stop`);
  }
});

test('token-notes: a longer prefix is never shadowed by an earlier, shorter one', () => {
  prefix.forEach(([p, note], i) => {
    assert.match(note, /\.$/, p);
    for (const [earlier] of prefix.slice(0, i)) assert.ok(!p.startsWith(earlier), `'${p}' is never reached: '${earlier}' comes first`);
  });
});

test('token-notes: noteFor resolves exact names before prefixes and has a fallback', () => {
  assert.equal(noteFor('background'), exact.background);
  assert.equal(noteFor('layer-hover-02'), prefix.find(([p]) => p === 'layer-hover-')[1]);
  assert.match(noteFor('no-such-token'), /^Carbon token/);
  for (const name of colorTokens) assert.ok(noteFor(name).length > 0, name);
  // The notes are what the colors page shows: every token's usage starts with its note (build.mjs may append a contrast remark).
  for (const t of json('project/tokens.json').color.tokens) assert.ok(t.usage.startsWith(noteFor(t.name)), `${t.name}: project/tokens.json is stale`);
});

// ------------------------------------------------------------------ pklnx wordmark and pattern

const geo = json('theme/logo-geometry.json');
const brand = json('theme/brand.json').logo;
const tokens = json('theme/tokens.json');
const assetFile = (group, name) => path.join(ROOT, 'project/assets', group, name);

test('the committed wordmark SVGs carry the geometry and the colors of the build inputs', () => {
  const colors = { dark: [brand.dark.ink, brand.dark.star], light: [brand.light.ink, brand.light.star], black: ['#000000', '#000000'], white: ['#ffffff', '#ffffff'] };
  for (const [variant, [ink, star]] of Object.entries(colors)) {
    const svg = readFileSync(assetFile('Logos', `pklnx-wordmark-${variant}.svg`), 'utf8');
    assert.ok(svg.includes(`viewBox="${geo.word.viewBox}"`), `${variant}: viewBox`);
    assert.ok(svg.includes(`<path fill="${ink}" d="${geo.word.text}"/>`), `${variant}: text path or ink`);
    assert.ok(svg.includes(`<path fill="${star}" d="${geo.word.star}"/>`), `${variant}: star path or color`);
    assert.ok(svg.includes(`<path fill="${ink}" d="${geo.word.bracket}"/>`), `${variant}: bracket path or ink`);
    new Resvg(svg).render();
    const mark = readFileSync(assetFile('Logos', `pklnx-mark-${variant}.svg`), 'utf8');
    assert.ok(mark.includes(`<path fill="${ink}" d="${geo.mark.bracket}"/><path fill="${star}" d="${geo.mark.star}"/>`), `${variant}: mark`);
  }
});

test('the committed pattern SVGs use the ground, line and star colors of theme/tokens.json', () => {
  for (const [theme, file] of [['dark', 'pattern-dark.svg'], ['light', 'pattern-light.svg']]) {
    const svg = readFileSync(assetFile('Patterns', file), 'utf8');
    assert.match(svg, /^<svg [^>]*viewBox="0 0 96 96"/, file);
    assert.ok(svg.includes(`<rect width="96" height="96" fill="${tokens[theme].background}"/>`), `${file}: ground`);
    assert.ok(svg.includes(`fill="${tokens[theme]['border-subtle-00']}"`), `${file}: line color`);
    assert.ok(svg.includes(`fill="${tokens[theme].star}"`), `${file}: star color`);
    new Resvg(svg).render();
  }
});

test('the wordmark and pattern SVGs are indexed, and the Pattern and Logo components document them', () => {
  for (const [group, name] of [['Logos', 'pklnx-wordmark-dark.svg'], ['Logos', 'pklnx-wordmark-light.svg'], ['Patterns', 'pattern-dark.svg'], ['Patterns', 'pattern-light.svg']]) {
    assert.ok(index.assetGroups[group].files[name], `${group}/${name} is not in project/design-system.json`);
    assert.ok(existsSync(assetFile(group, name)), `${group}/${name}`);
  }
  assert.match(read('project/components/Pattern/README.md'), /pattern-dark\.svg/);
  assert.match(read('project/assets/Logos/README.md'), /pklnx-wordmark-dark\.svg/);
});
