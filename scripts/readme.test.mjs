// The README against the repository (design-system #30): the Layout table names every file
// under scripts/ and project/components/, Requirements names the tools the build needs, and the
// theme README's list of changed tokens matches `changed` in theme/tokens.json. Text-based; no
// Markdown parser is a dependency.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const section = (text, title) => {
  const m = new RegExp(`^## ${title}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(text);
  assert.ok(m, `section "${title}"`);
  return m[1];
};
const readme = read('README.md');
const layout = section(readme, 'Layout');

test('Layout names every file and directory directly under scripts/', () => {
  const entries = readdirSync(path.join(ROOT, 'scripts'), { withFileTypes: true });
  assert.ok(entries.length > 20, 'scripts/ is read');
  for (const e of entries) {
    if (e.name === '__pycache__') continue; // Python's cache of build_logo.py, not in the repository
    if (e.isDirectory()) assert.ok(layout.includes(`\`scripts/${e.name}/\``), `Layout: scripts/${e.name}/`);
    else assert.match(layout, new RegExp(`\`(scripts/)?${e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``), `Layout: ${e.name}`);
  }
  assert.ok(layout.includes('`scripts/*.test.mjs`'), 'Layout: the tests as a group');
});

test('Layout names project/components/ and the files directly in it', () => {
  assert.ok(layout.includes('| `project/components/` |'), 'Layout: project/components/ row');
  for (const e of readdirSync(path.join(ROOT, 'project/components'), { withFileTypes: true })) {
    if (e.isFile()) assert.ok(layout.includes(e.name), `Layout: ${e.name}`);
  }
});

test('Requirements: Node from .node-version, Python 3.13 as in CI, Chromium through CHROME for the previews only', () => {
  const requirements = section(readme, 'Requirements');
  const node = read('.node-version').trim();
  assert.match(requirements, new RegExp(`\`\\.node-version\` \\(${node}\\)`), 'the Node major of .node-version');
  const ciPython = /python-version: '([\d.]+)'/.exec(read('.github/workflows/ci.yml'))?.[1];
  assert.equal(ciPython, '3.13');
  assert.match(requirements, new RegExp(`\\*\\*Python ${ciPython.replace('.', '\\.')}\\*\\*`), 'the Python version CI uses');
  assert.match(requirements, /`scripts\/requirements-logo\.txt`/);
  assert.match(requirements, /`scripts\/render-previews\.mjs`.*`CHROME`/);
});

test('README: the Sass export is reached through the sass condition, and the version policy names the removed default', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(Object.keys(pkg.exports['./theme']), ['sass']);
  assert.match(readme, /plain JS `import` of `@pklnx\/design-system\/theme` is not supported/);
  assert.match(section(readme, 'Package').replace(/^### /gm, '\n## '), /Removing an export condition counts as removing an export/);
});

test('theme README: the changed tokens it names are the `changed` set of theme/tokens.json', () => {
  const { changed } = JSON.parse(read('theme/tokens.json'));
  const all = new Set([...Object.keys(changed.light), ...Object.keys(changed.dark)]);
  assert.ok(all.size > 20, 'changed tokens are read');
  const color = section(read('project/README.md'), 'Color');
  const bullet = color.split('\n').find((l) => l.startsWith('- Every color token is a Carbon token'));
  assert.ok(bullet, 'the bullet about the changed tokens');
  // The bullet also names `changed` (the set itself) and a token that stays Blue on purpose.
  const stays = 'notification-background-info';
  assert.ok(!all.has(stays) && bullet.includes(`\`${stays}\``), `${stays} stays Carbon's Blue and the README says so`);
  const named = [...bullet.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]).filter((n) => n !== 'changed' && n !== stays);
  // Everything the bullet names as a token is changed ...
  for (const n of named) assert.ok(all.has(n), `${n} is named as changed but is not in "changed"`);
  // ... and every changed token is named in the Color section exactly, or is the hover, active or
  // text-hover step of a token named there. No other suffix passes, so a visited-link token or an
  // invented `link-inverse-bogus` has to be named itself.
  const names = new Set([...color.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]));
  const STEPS = ['', '-hover', '-active', '-text-hover'];
  for (const t of all) {
    assert.ok(STEPS.some((suffix) => t.endsWith(suffix) && names.has(t.slice(0, t.length - suffix.length))), `${t} is changed but the theme README does not name it or its base token`);
  }
});
