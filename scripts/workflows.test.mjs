// Rules every workflow in .github/workflows follows (design-system #6): actions pinned by
// commit SHA, npm without install scripts, IBM's telemetry off where npm runs, one Node
// version, checkouts without persisted credentials.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIR = '.github/workflows';
const workflows = readdirSync(path.join(ROOT, DIR)).filter((f) => /\.ya?ml$/.test(f)).sort()
  .map((f) => ({ name: f, text: readFileSync(path.join(ROOT, DIR, f), 'utf8') }));

test('the workflows are ci, pages and release', () => {
  assert.deepEqual(workflows.map((w) => w.name), ['ci.yml', 'pages.yml', 'release.yml']);
});

test('every action is pinned by commit SHA with its version in a comment', () => {
  for (const w of workflows) {
    for (const m of w.text.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/gm)) {
      assert.match(m[1], /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${w.name}: ${m[1]}`);
      assert.match(m[2], /^ # v\d+\.\d+\.\d+$/, `${w.name}: ${m[1]} has no version comment`);
    }
  }
});

test('npm installs without install scripts, with IBM telemetry off, on Node 26', () => {
  for (const w of workflows) {
    const installs = [...w.text.matchAll(/\bnpm (?:ci|install|i)\b.*$/gm)].map((m) => m[0]);
    for (const line of installs) assert.match(line, /^npm ci --ignore-scripts$/, `${w.name}: ${line}`);
    if (!installs.length) continue;
    assert.match(w.text, /IBM_TELEMETRY_DISABLED: 'true'/, `${w.name}: telemetry`);
    const versions = [...w.text.matchAll(/node-version:\s*(\S+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(versions)], ['26'], `${w.name}: node-version`);
    assert.match(w.text, /package-manager-cache: false/, `${w.name}: no dependency cache`);
  }
});

test('every checkout leaves no credentials behind', () => {
  for (const w of workflows) {
    for (const m of w.text.matchAll(/uses: actions\/checkout@\S+.*\n((?:\s+.*\n){0,3})/g)) {
      assert.match(m[1], /persist-credentials: false/, `${w.name}: checkout without persist-credentials: false`);
    }
  }
});

test('the workflows grant no permissions at the top level of pages and release', () => {
  for (const w of workflows.filter((x) => x.name !== 'ci.yml')) {
    assert.match(w.text, /^permissions: \{\}$/m, w.name);
  }
});

// ---- one entry point for the generation order (design-system #25)
const ci = () => workflows.find((w) => w.name === 'ci.yml').text;
const ciStep = (name) => {
  const text = ci();
  const start = text.indexOf(`- name: ${name}\n`);
  assert.ok(start >= 0, `CI step "${name}"`);
  const end = text.indexOf('\n      - ', start + 1);
  const run = /run: \|?\s*\n?([\s\S]*)$/.exec(text.slice(start, end < 0 ? undefined : end));
  assert.ok(run, `CI step "${name}" with a run block`);
  return run[1];
};
const readmeBlocks = () => {
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const building = /^## Building\n([\s\S]*?)^## /m.exec(readme);
  assert.ok(building, 'README "Building" section');
  return [...building[1].matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1].split('\n').map((l) => l.replace(/\s+#.*$/, '').trim()).filter(Boolean));
};

test('CI and README "Building" call the same entry point and the same install lines', () => {
  const ciCommands = ciStep('Generated files are committed').split('\n').map((l) => l.trim()).filter((l) => /^npm run /.test(l));
  assert.ok(ciCommands.length, 'the step runs at least one npm script');
  assert.deepEqual(ciCommands, ['npm run build:all'], 'CI step "Generated files are committed" runs exactly the entry point');
  const [setup] = readmeBlocks();
  assert.ok(setup.length, 'README "Building" setup block');
  assert.ok(setup.includes('npm run build:all'), 'README "Building" runs npm run build:all');
  const pip = 'pip install --require-hashes --only-binary :all: -r scripts/requirements-logo.txt';
  assert.equal(ciStep('Install the Python packages of the logo scripts').trim(), pip, 'CI installs the Python packages with hashes');
  assert.ok(setup.includes(pip), 'README names the same pip line');
  assert.ok(setup.indexOf('npm ci --ignore-scripts') < setup.indexOf(pip), 'npm ci comes before pip (the logo scripts read the fonts from node_modules)');
  assert.match(ciStep('Generated files are committed'), /git status --porcelain[\s\S]*::error::/, 'the drift check stays with its ::error line');
});

test('CI does not list the generation steps itself, only the entry point defines the order', () => {
  for (const w of workflows) {
    assert.doesNotMatch(w.text, /python3? scripts\//, `${w.name}: a Python script called directly`);
    assert.doesNotMatch(w.text, /node scripts\/(?:build_logo|build_product_logos|build_assets|render_pngs|build_icons)/, `${w.name}: a generation step called directly`);
  }
});

test('README "Building" lists the steps of scripts/build_all.mjs in its order', async () => {
  const { STEPS, commandOf } = await import('./build_all.mjs');
  const [, steps] = readmeBlocks();
  assert.ok(steps?.length, 'README "Building" step block');
  // build.mjs is `npm run build`; the README says so in its comment.
  assert.deepEqual(steps, STEPS.map(commandOf), 'README step list and STEPS differ in commands or order');
});

// A plain (unquoted) single-line scalar must not contain ": " or " #" and must not start with a YAML
// indicator, or GitHub refuses the whole file (ci.yml once had `run: pip install ... :all: ...`).
// No YAML parser is a dependency, so the rule is checked on the text; multi-line `run: |` blocks are exempt.
test('YAML rule: a single-line `run:` value has no ": ", no " #" and does not start with a YAML indicator', () => {
  const files = [...workflows.map((w) => [`${DIR}/${w.name}`, w.text])];
  const actions = path.join(ROOT, '.github/actions');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /^action\.ya?ml$/.test(e.name) ? [path.join(d, e.name)] : []));
  if (existsSync(actions)) for (const f of walk(actions)) files.push([path.relative(ROOT, f), readFileSync(f, 'utf8')]);
  let checked = 0;
  for (const [name, text] of files) {
    text.split('\n').forEach((line, i) => {
      const m = /^\s*(?:-\s+)?run:[ \t]+(\S.*)$/.exec(line);
      if (!m) return;
      const value = m[1].trimEnd();
      if (/^[|>][+-]?\d?(?:\s+#.*)?$/.test(value)) return; // block scalar
      if (/^["']/.test(value)) return; // quoted scalar: ": " is fine inside
      checked++;
      assert.doesNotMatch(value, /: /, `${name}:${i + 1}: plain scalar contains ": " (use a \`run: |\` block): ${value}`);
      assert.doesNotMatch(value, / #/, `${name}:${i + 1}: plain scalar contains " #" (a comment starts there): ${value}`);
      assert.doesNotMatch(value, /^[-?:,[\]{}#&*!|>'"%@`]/, `${name}:${i + 1}: plain scalar starts with a YAML indicator: ${value}`);
    });
  }
  assert.ok(checked > 0, 'at least one single-line run: value is checked');
});
