// Rules every workflow in .github/workflows follows (design-system #6): actions pinned by
// commit SHA, npm without install scripts, IBM's telemetry off where npm runs, one Node
// version, checkouts without persisted credentials.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

test('the CI step "Logos are generated" runs the commands of README "Building" in the same order', () => {
  const ci = workflows.find((w) => w.name === 'ci.yml').text;
  const step = /- name: Logos are generated\n\s+run: \|\n((?:\s{10}.*\n)+)/.exec(ci);
  assert.ok(step, 'step "Logos are generated" with a run block');
  const isCommand = (l) => /^(?:pip|python3|node) /.test(l);
  const ciCommands = step[1].split('\n').map((l) => l.trim()).filter(isCommand);
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const building = /^## Building\n\n```sh\n([\s\S]*?)```/m.exec(readme);
  assert.ok(building, 'README "Building" code block');
  const readmeCommands = building[1].split('\n').map((l) => l.replace(/\s+#.*$/, '').trim()).filter(isCommand);
  const inReadme = readmeCommands.filter((c) => ciCommands.includes(c));
  assert.deepEqual(inReadme, ciCommands, 'README "Building" and the CI step differ in commands or order');
});
