// Tests of the build scripts' robustness (design-system #27): a checkout path with a space,
// render-previews.mjs exiting non-zero on a failed render, and the rules the Python logo
// scripts follow (UTF-8 files closed by `with`, no `assert`, JSON files end with a newline).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scripts = readdirSync(path.join(ROOT, 'scripts'));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

// A fresh directory whose name has a space, removed at the end of the test.
function spaced(t, name) {
  const base = mkdtempSync(path.join(tmpdir(), 'pklnx-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, name);
  mkdirSync(dir);
  return { base, dir };
}

const run = (file, args, opts) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 120000, ...opts });

test('no script derives a path from `new URL(import.meta.url).pathname`', () => {
  for (const f of scripts.filter((s) => /\.mjs$/.test(s) && s !== 'script-robustness.test.mjs')) {
    assert.doesNotMatch(read(`scripts/${f}`), /new URL\([^)]*import\.meta\.url\)\.pathname/, `${f} keeps %20 for a space in the path; use fileURLToPath`);
  }
});

test('the build, icon and site scripts work in a checkout whose path has a space', (t) => {
  const { dir } = spaced(t, 'with space');
  for (const f of ['package.json', 'scripts', 'src', 'theme', 'project']) cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  for (const script of ['build.mjs', 'build_icons.mjs', 'build_site.mjs']) {
    const r = run(path.join(dir, 'scripts', script), [], { cwd: dir });
    assert.equal(r.status, 0, `${script}: ${r.stderr}`);
  }
  // The build wrote into the checkout itself, not into a directory named with %20.
  assert.equal(read('theme/tokens.json'), readFileSync(path.join(dir, 'theme/tokens.json'), 'utf8'));
  assert.ok(existsSync(path.join(dir, 'project/assets/Icons/star.svg')));
  assert.ok(existsSync(path.join(dir, 'site/index.html')));
  assert.deepEqual(readdirSync(path.dirname(dir)).filter((n) => n.includes('%')), []);
});

// render-previews.mjs in a throw-away checkout with one preview and a stand-in for Chromium.
function previewCheckout(t) {
  const { dir } = spaced(t, 'preview checkout');
  mkdirSync(path.join(dir, 'scripts'));
  cpSync(path.join(ROOT, 'scripts/render-previews.mjs'), path.join(dir, 'scripts/render-previews.mjs'));
  mkdirSync(path.join(dir, 'project/components/Demo'), { recursive: true });
  writeFileSync(path.join(dir, 'project/components/Demo/preview.html'), '<!-- @dsCard width=200 height=100 -->\n<html><head></head><body>x</body></html>\n');
  const fake = (name, body) => {
    const file = path.join(dir, name);
    writeFileSync(file, `#!/bin/sh\n${body}\n`);
    chmodSync(file, 0o755);
    return file;
  };
  const render = (chrome) => {
    const env = { ...process.env };
    delete env.CHROME;
    if (chrome !== undefined) env.CHROME = chrome;
    return run(path.join(dir, 'scripts/render-previews.mjs'), [], { cwd: dir, env });
  };
  return { dir, fake, render };
}

test('render-previews: exits 0 and writes both themes when Chromium renders', (t) => {
  const { dir, fake, render } = previewCheckout(t);
  // Writes the file named by --screenshot=..., as Chromium does.
  const chrome = fake('chrome-ok', 'for a in "$@"; do case "$a" in --screenshot=*) printf png > "${a#--screenshot=}";; esac; done');
  const r = render(chrome);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /rendered Demo/);
  assert.ok(existsSync(path.join(dir, '.render/Demo-dark.png')) && existsSync(path.join(dir, '.render/Demo-light.png')));
});

test('render-previews: exits non-zero when Chromium fails', (t) => {
  const { fake, render } = previewCheckout(t);
  const r = render(fake('chrome-fails', 'exit 1'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /fail Demo dark/);
  assert.match(r.stderr, /2 renders failed/);
  assert.doesNotMatch(r.stdout, /rendered Demo/);
});

test('render-previews: exits non-zero when Chromium exits 0 without a screenshot', (t) => {
  const { fake, render } = previewCheckout(t);
  const r = render(fake('chrome-silent', 'exit 0'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /wrote no screenshot/);
});

test('render-previews: requires CHROME to be set to an executable file', (t) => {
  const { dir, render } = previewCheckout(t);
  const unset = render(undefined);
  assert.notEqual(unset.status, 0);
  assert.match(unset.stderr, /set CHROME/);
  const missing = render(path.join(dir, 'no-such-chromium'));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /not an executable file/);
  const plain = path.join(dir, 'plain-file');
  writeFileSync(plain, 'not executable');
  chmodSync(plain, 0o644);
  const notExecutable = render(plain);
  assert.notEqual(notExecutable.status, 0);
  assert.match(notExecutable.stderr, /not an executable file/);
  const directory = render(dir);
  assert.notEqual(directory.status, 0);
  assert.match(directory.stderr, /not an executable file/);
});

test('the Python scripts open files with `with` and UTF-8, and do not use assert', () => {
  for (const f of scripts.filter((s) => s.endsWith('.py'))) {
    const lines = read(`scripts/${f}`).split('\n');
    lines.forEach((line, i) => {
      const where = `${f}:${i + 1}`;
      if (/\bopen\(/.test(line)) {
        assert.match(line, /^\s*with open\(/, `${where}: open() outside \`with\``);
        assert.match(line, /encoding="utf-8"/, `${where}: open() without encoding="utf-8"`);
      }
      assert.doesNotMatch(line, /^\s*assert\b/, `${where}: assert is stripped by python -O; raise an exception`);
    });
  }
});

test('the JSON files the logo scripts and the index keep end with a newline', () => {
  for (const f of ['theme/logo-geometry.json', 'project/design-system.json']) {
    assert.ok(read(f).endsWith('}\n'), `${f} must end with a newline`);
  }
});
