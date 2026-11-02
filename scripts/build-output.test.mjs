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
import vm from 'node:vm';
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
// Every directory of project/components with a preview.html is a component; the one whose @dsCard
// comment carries the `cover` flag is the overview's banner and has a preview but no page of its own.
const previewDirs = readdirSync(path.join(ROOT, 'project/components'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(path.join(ROOT, 'project/components', e.name, 'preview.html')))
  .map((e) => e.name).sort();
const dsCard = (name) => /@dsCard([^>]*)-->/.exec(readFileSync(path.join(ROOT, 'project/components', name, 'preview.html'), 'utf8'))?.[1] || '';
const coverDirs = previewDirs.filter((n) => /(?:^|\s)cover(?=\s|$)/.test(dsCard(n)));
const componentPages = previewDirs.filter((n) => !coverDirs.includes(n));

// The files every preview links instead of repeating them (design-system #29).
const sharedFiles = ['preview-shared.css', 'preview-shared.js', 'preview-din5008.css', 'preview-din5008.js'];

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
  // The files the previews link as ../preview-*: at the site root, where ../ from preview/<Name>.html leads.
  assert.deepEqual(files(path.join(ROOT, 'project/components')).filter((n) => n.startsWith('preview-')), sharedFiles.toSorted(), 'every preview-* file of project/components is listed here');
  for (const f of sharedFiles) assert.deepEqual(readFileSync(path.join(out, f)), readFileSync(path.join(ROOT, 'project/components', f)), `${f}: copy`);
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

// build_site.mjs empties its output directory, so these tests never point it at a real directory:
// each runs a copy of the script in a throw-away "checkout" in a temp dir (the script, project/,
// theme/ and package.json; node_modules is a symlink that is never an output directory), and every
// directory it is given lies inside that temp dir. If a guard is gone, only temp files are lost.
function throwaway(t, name = 'checkout') {
  const base = tempDir(t);
  const checkout = path.join(base, name);
  mkdirSync(path.join(checkout, 'scripts'), { recursive: true });
  cpSync(path.join(ROOT, 'scripts/build_site.mjs'), path.join(checkout, 'scripts/build_site.mjs'));
  for (const d of ['project', 'theme']) cpSync(path.join(ROOT, d), path.join(checkout, d), { recursive: true });
  cpSync(path.join(ROOT, 'package.json'), path.join(checkout, 'package.json'));
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(checkout, 'node_modules'));
  writeFileSync(path.join(checkout, 'UNTRACKED.txt'), 'work that git does not have');
  writeFileSync(path.join(base, 'keep.txt'), 'x');
  const site = (...args) => spawnSync(process.execPath, [path.join(checkout, 'scripts/build_site.mjs'), ...args], { encoding: 'utf8', timeout: 120000, cwd: base });
  // Nothing of the checkout or its surroundings is gone.
  const intact = (message) => {
    for (const f of ['scripts/build_site.mjs', 'project/design-system.json', 'theme/logo-geometry.json', 'UNTRACKED.txt']) assert.ok(existsSync(path.join(checkout, f)), `${message}: ${f} is gone`);
    assert.ok(existsSync(path.join(base, 'keep.txt')), `${message}: keep.txt is gone`);
  };
  return { base, checkout, site, intact };
}
const refused = (r, message, pattern = /refusing to (?:empty|replace)/) => {
  assert.notEqual(r.status, 0, `${message}: exit status`);
  assert.match(r.stderr, pattern, message);
};

// ------------------------------------------------------------------ preview boilerplate and the cover marker (#29)

const previewSource = (name) => read(`project/components/${name}/preview.html`);

test('previews: the shared style, prelude and logo mounting live in the preview-* files only', () => {
  for (const name of previewDirs) {
    const src = previewSource(name);
    assert.doesNotMatch(src, /var P = window\.Pklnx/, `${name}: the P/h prelude is in preview-shared.js`);
    assert.doesNotMatch(src, /body\{margin:0/, `${name}: the body style is in preview-shared.css`);
    assert.doesNotMatch(src, /querySelectorAll\('\[data-logo\]'\)/, `${name}: the logo mounting is in preview-shared.js`);
    assert.match(src, /<link rel="stylesheet" href="\.\.\/preview-shared\.css">/, `${name}: links the shared style`);
    // A preview that uses P, h or a data-logo element needs the script.
    if (/\bP\.[A-Z]|\bh\(|data-logo=/.test(src)) assert.match(src, /<script src="\.\.\/preview-shared\.js"><\/script>/, `${name}: loads preview-shared.js`);
    // Every ../preview-* reference names a file that exists next to the component directories (claude.ai serves it from there, the site from its root).
    for (const [, f] of src.matchAll(/(?:href|src)="\.\.\/(preview-[^"]+)"/g)) assert.ok(sharedFiles.includes(f), `${name}: ${f} is not a shared preview file`);
  }
  // The DIN 5008 page of Invoice and Letterhead is built once.
  for (const name of ['Invoice', 'Letterhead']) {
    const src = previewSource(name);
    assert.match(src, /href="\.\.\/preview-din5008\.css"/, name);
    assert.match(src, /<script src="\.\.\/preview-din5008\.js"><\/script>/, name);
    assert.match(src, /data-din5008/, name);
    assert.doesNotMatch(src, /class="mk"|class="foot"|\.page\{/, `${name}: the DIN 5008 frame is in preview-din5008.*`);
  }
});

// The shared scripts run against a stand-in for the page: they must define P and h, mount every logo, and fill every DIN page.
function runInPage(file, { readyState = 'loading', logos = [], pages = [] } = {}) {
  const calls = { roots: [], created: [], listeners: [], inserted: [] };
  const React = { createElement: (type, props) => ({ type, props }) };
  const element = (attrs) => ({ getAttribute: (k) => attrs[k], hasAttribute: (k) => k in attrs });
  const document = {
    readyState,
    addEventListener: (ev, fn) => calls.listeners.push([ev, fn]),
    querySelectorAll: (sel) => (sel === '[data-logo]' ? logos.map(element).map((e, i) => Object.assign(e, { i })) : sel === '[data-din5008]'
      ? pages.map(() => ({ insertAdjacentHTML: (pos, html) => calls.inserted.push([pos, html]) })) : []),
  };
  const ReactDOM = { createRoot: (el) => ({ render: (node) => calls.roots.push([el.i, node]) }) };
  const Pklnx = { Logo: function Logo() {} };
  const sandbox = { React, ReactDOM, document, window: { Pklnx }, Pklnx };
  vm.runInNewContext(read(`project/components/${file}`), sandbox);
  return { calls, sandbox, Pklnx, React };
}

test('preview-shared.js: defines P and h and mounts every [data-logo] element as a Logo', () => {
  const logos = [{ 'data-logo': 'wordmark', 'data-h': '26' }, { 'data-logo': 'mark', 'data-h': '48', 'data-mono': '' }];
  const { calls, sandbox, Pklnx, React } = runInPage('preview-shared.js', { logos });
  assert.equal(sandbox.P, Pklnx);
  assert.equal(sandbox.h, React.createElement);
  assert.deepEqual(calls.roots, [], 'nothing is mounted before the page has been parsed');
  assert.equal(calls.listeners.length, 1);
  assert.equal(calls.listeners[0][0], 'DOMContentLoaded');
  calls.listeners[0][1]();
  assert.deepEqual(calls.roots.map(([i, n]) => [i, n.type === Pklnx.Logo, { ...n.props }]), [
    [0, true, { variant: 'wordmark', height: 26, mono: false }],
    [1, true, { variant: 'mark', height: 48, mono: true }],
  ]);
  // A script that is loaded after the parse mounts at once.
  assert.equal(runInPage('preview-shared.js', { readyState: 'complete', logos }).calls.roots.length, 2);
});

test('preview-din5008.js: puts the frame before and the footer after the content of every DIN page', () => {
  const { calls } = runInPage('preview-din5008.js', { pages: [1, 2] });
  assert.equal(calls.inserted.length, 4);
  for (const [pos, html] of [calls.inserted[0], calls.inserted[2]]) {
    assert.equal(pos, 'afterbegin');
    assert.equal((html.match(/class="mk"/g) || []).length, 3, 'three fold and punch marks');
    assert.match(html, /data-logo="wordmark" data-h="26"/);
  }
  for (const [pos, html] of [calls.inserted[1], calls.inserted[3]]) {
    assert.equal(pos, 'beforeend');
    assert.match(html, /^<div class="foot">[\s\S]*<\/div>$/);
    assert.equal((html.match(/class="lbl"/g) || []).length, 3, 'contact, bank, tax');
  }
});

// claude.ai finds the cover of a design system by the path components/Cover/preview.html. A README.md or a
// .d.ts beside it, or `Cover` in the bundle header, makes it an ordinary component and the system has no
// cover (artifact-type reference cover.md). So the folder stays bare, and the flag sits on that preview.
test('Cover: the flagged preview is components/Cover/preview.html and the folder stays bare for claude.ai', () => {
  assert.deepEqual(coverDirs, ['Cover'], 'the cover flag sits on components/Cover/preview.html and nowhere else');
  const dir = path.join(ROOT, 'project/components/Cover');
  assert.deepEqual(files(dir), ['preview.html'], 'components/Cover/ holds the preview only: no README.md, no .d.ts, nothing else');
  assert.ok(!existsSync(path.join(ROOT, 'project/components/Cover.d.ts')), 'no components/Cover.d.ts either');
  const header = /^\/\* @ds-bundle: (.*) \*\//.exec(read('project/components/bundle.js').split('\n')[0]);
  assert.ok(header, 'bundle.js starts with the @ds-bundle header');
  const listed = JSON.parse(header[1]).components.map((c) => c.name);
  assert.ok(listed.length > 0 && !listed.includes('Cover'), `the bundle header names Cover as a component: ${listed}`);
});

test('previews: every component but the cover has a README', () => {
  assert.ok(componentPages.length > 0 && !componentPages.includes('Cover'));
  for (const name of componentPages) assert.ok(existsSync(path.join(ROOT, 'project/components', name, 'README.md')), `${name}: README.md`);
});

// The site build finds the banner by its flag, never by its name: the flag moved to another preview moves
// the banner there. This is the build's behaviour only; the committed state is held to claude.ai's rule by
// the Cover test above.
function withCard(t, edits) {
  const env = throwaway(t);
  for (const [name, from, to] of edits) {
    const file = path.join(env.checkout, 'project/components', name, 'preview.html');
    const src = readFileSync(file, 'utf8');
    assert.ok(src.includes(from), `${name}: ${from}`);
    writeFileSync(file, src.replace(from, to));
  }
  return env;
}

test('build_site.mjs: the site banner is the preview with the cover flag, whatever its name', (t) => {
  const { base, site } = withCard(t, [['Cover', 'height=288 cover -->', 'height=288 -->'], ['Button', 'height=140 ', 'height=140 cover ']]);
  const out = path.join(base, 'out');
  const r = site(out);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(path.join(out, 'preview/Button.html')) && !existsSync(path.join(out, 'components/Button.html')), 'Button is the banner: a preview, no page');
  assert.ok(existsSync(path.join(out, 'components/Cover.html')), 'Cover is an ordinary component now: it has a page');
  assert.match(readFileSync(path.join(out, 'index.html'), 'utf8'), /<iframe class="frame cover" src="preview\/Button\.html" title="Button"/);
});

test('build_site.mjs: no banner or two banners stop the build and leave the previous site alone', (t) => {
  for (const [label, edits, found] of [
    ['none', [['Cover', ' cover -->', ' -->']], 'found 0'],
    ['two', [['Button', 'height=140 ', 'height=140 cover ']], 'found 2: Button, Cover'],
  ]) {
    const { base, site } = withCard(t, edits);
    const out = path.join(base, `out-${label}`);
    // Something that looks like a previous site build, which the failing run must not empty.
    mkdirSync(out);
    writeFileSync(path.join(out, 'index.html'), 'previous');
    writeFileSync(path.join(out, '.nojekyll'), '');
    const r = site(out);
    refused(r, label, /exactly one preview must carry the "cover" flag/);
    assert.ok(r.stderr.includes(found), `${label}: ${r.stderr}`);
    assert.equal(readFileSync(path.join(out, 'index.html'), 'utf8'), 'previous', `${label}: the previous site is still there`);
  }
});

test('build_site.mjs: the default output is site/ in the checkout, and a second run replaces it', (t) => {
  const { checkout, site, intact } = throwaway(t);
  assert.equal(site().status, 0);
  assert.ok(existsSync(path.join(checkout, 'site/index.html')) && existsSync(path.join(checkout, 'site/.nojekyll')));
  writeFileSync(path.join(checkout, 'site/stale.txt'), 'left over from an earlier build');
  const again = site();
  assert.equal(again.status, 0, again.stderr);
  assert.ok(!existsSync(path.join(checkout, 'site/stale.txt')), 'the previous site build is emptied first');
  assert.ok(existsSync(path.join(checkout, 'site/index.html')));
  intact('default');
});

test('build_site.mjs: builds into a missing, an empty and a previous-build directory outside the checkout', (t) => {
  const { base, site, intact } = throwaway(t);
  const missing = path.join(base, 'new', 'deeper', 'out');
  const empty = path.join(base, 'empty');
  mkdirSync(empty);
  const previous = path.join(base, 'previous');
  for (const dir of [missing, empty, previous]) {
    const r = site(dir);
    assert.equal(r.status, 0, `${dir}: ${r.stderr}`);
    assert.ok(existsSync(path.join(dir, 'index.html')) && existsSync(path.join(dir, '.nojekyll')), dir);
  }
  writeFileSync(path.join(previous, 'stale.txt'), 'left over');
  assert.equal(site(previous).status, 0);
  assert.ok(!existsSync(path.join(previous, 'stale.txt')));
  intact('outside');
});

test('build_site.mjs: refuses the checkout and the directories above it', (t) => {
  const { base, checkout, site, intact } = throwaway(t);
  for (const dir of [checkout, `${checkout}/`, `${checkout}/scripts/..`, base, path.dirname(base), '/']) {
    refused(site(dir), dir, /is or contains the checkout/);
    intact(dir);
  }
});

test('build_site.mjs: refuses any other directory inside the checkout', (t) => {
  const { checkout, site, intact } = throwaway(t);
  for (const sub of ['scripts', 'project', 'project/assets', 'theme', 'site/nested']) {
    refused(site(path.join(checkout, sub)), sub, /inside the checkout other than site\//);
    intact(sub);
  }
  assert.ok(!existsSync(path.join(checkout, 'site')), 'nothing was built');
});

test('build_site.mjs: refuses a symbolic link to the checkout, or to a directory above or inside it', (t) => {
  const { base, checkout, site, intact } = throwaway(t);
  symlinkSync(checkout, path.join(base, 'link-to-checkout'));
  symlinkSync(base, path.join(base, 'link-to-base'));
  symlinkSync(path.join(checkout, 'scripts'), path.join(base, 'link-to-scripts'));
  for (const dir of [
    path.join(base, 'link-to-checkout'),
    path.join(base, 'link-to-base', 'checkout'),
    path.join(base, 'link-to-base'),
    path.join(base, 'link-to-scripts'),
    path.join(base, 'link-to-checkout', 'scripts'),
    path.join(base, 'link-to-checkout', 'not-yet', 'there'), // a missing tail below a link into the checkout
  ]) {
    refused(site(dir), dir);
    intact(dir);
  }
  // Run through a link with --preserve-symlinks-main, the script's own location is the link: the checkout is still found.
  const viaLink = spawnSync(process.execPath, ['--preserve-symlinks-main', path.join(base, 'link-to-checkout/scripts/build_site.mjs'), checkout], { encoding: 'utf8', timeout: 120000, cwd: base });
  refused(viaLink, 'script run through a link', /is or contains the checkout/);
  intact('script run through a link');
  // A link whose target does not exist cannot be checked.
  symlinkSync(path.join(checkout, 'not-there'), path.join(base, 'dangling'));
  refused(site(path.join(base, 'dangling')), 'dangling', /dangling symbolic link/);
  assert.ok(!existsSync(path.join(checkout, 'not-there')));
  intact('links');
});

test('build_site.mjs: refuses a non-empty directory that is not a previous site build, and a file', (t) => {
  const { base, checkout, site, intact } = throwaway(t);
  const unrelated = path.join(base, 'unrelated');
  mkdirSync(unrelated);
  writeFileSync(path.join(unrelated, 'notes.txt'), 'untracked');
  const halfBuilt = path.join(base, 'half-built');
  mkdirSync(halfBuilt);
  writeFileSync(path.join(halfBuilt, 'index.html'), '<html></html>'); // no .nojekyll
  writeFileSync(path.join(halfBuilt, 'notes.txt'), 'untracked');
  const onlyMarker = path.join(base, 'only-marker');
  mkdirSync(onlyMarker);
  writeFileSync(path.join(onlyMarker, '.nojekyll'), ''); // no index.html
  writeFileSync(path.join(onlyMarker, 'notes.txt'), 'untracked');
  for (const dir of [unrelated, halfBuilt, onlyMarker]) {
    refused(site(dir), dir, /does not look like a previous site build/);
    assert.equal(readFileSync(path.join(dir, 'notes.txt'), 'utf8'), 'untracked', `${dir}: untouched`);
    assert.ok(!existsSync(path.join(dir, 'assets.html')), `${dir}: nothing was built`);
  }
  refused(site(path.join(base, 'keep.txt')), 'a file', /refusing to replace .*keep\.txt, which is not a directory/);
  intact('unrelated');
  // The site directory of the checkout is protected the same way.
  mkdirSync(path.join(checkout, 'site'));
  writeFileSync(path.join(checkout, 'site/mine.txt'), 'untracked');
  refused(site(), 'site/ with other files', /does not look like a previous site build/);
  assert.ok(existsSync(path.join(checkout, 'site/mine.txt')));
});

test('build_site.mjs: a name that starts with two dots is a name, not a parent', (t) => {
  // ROOT is <base>/..repo: relative(<base>, ROOT) is '..repo', which a bare startsWith('..') takes for "outside".
  const { base, checkout, site, intact } = throwaway(t, '..repo');
  refused(site(base), 'the parent of ..repo', /is or contains the checkout/);
  intact('parent');
  // A sibling called '..site' is outside the checkout and fine.
  const sibling = path.join(base, '..site');
  const r = site(sibling);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(path.join(sibling, 'index.html')));
  // A directory called '..x' inside the checkout is still inside it.
  refused(site(path.join(checkout, '..x')), 'inside', /inside the checkout other than site\//);
  intact('dotdot names');
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
  assert.ok(Object.keys(exact).length > 0 && prefix.length > 0, 'the note lists must not be empty by accident');
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
