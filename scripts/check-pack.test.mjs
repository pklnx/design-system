import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EXPECTED_FILES,
  LIFECYCLE_SCRIPTS,
  checkFiles,
  checkLifecycleScripts,
  checkPack,
  parsePackOutput,
} from './check-pack.mjs';

// Captured with npm 10.9.4: `npm pack --dry-run --json` of this package, and of
// the package.json before it had a `files` list (brand assets, scripts, src).
const sample = readFileSync(new URL('./fixtures/pack-dry-run.json', import.meta.url), 'utf8');
const sampleWithoutFiles = readFileSync(new URL('./fixtures/pack-dry-run-without-files.json', import.meta.url), 'utf8');
const pkg = { name: '@pklnx/design-system', scripts: { build: 'node scripts/build.mjs', test: 'node --test' } };

const packText = (paths) => JSON.stringify([{ name: '@pklnx/design-system', files: paths.map((path) => ({ path, size: 1, mode: 420 })) }]);

test('the captured npm pack sample parses to the 14 expected files', () => {
  const files = parsePackOutput(sample);
  assert.equal(files.length, 14);
  assert.deepEqual([...files].sort(), [...EXPECTED_FILES].sort());
  assert.deepEqual(checkPack(sample, pkg), []);
});

test('the exact list passes in any order', () => {
  assert.deepEqual(checkFiles([...EXPECTED_FILES].reverse()), []);
  assert.deepEqual(checkPack(packText(EXPECTED_FILES), pkg), []);
});

test('an extra brand asset fails', () => {
  const problems = checkPack(packText([...EXPECTED_FILES, 'theme/logo-geometry.json']), pkg);
  assert.deepEqual(problems, ['unexpected file in the tarball: theme/logo-geometry.json']);
});

test('a missing font fails', () => {
  const problems = checkPack(packText(EXPECTED_FILES.filter((p) => p !== 'project/fonts/IBMPlexSans-Regular.woff2')), pkg);
  assert.deepEqual(problems, ['missing from the tarball: project/fonts/IBMPlexSans-Regular.woff2']);
});

test('a file packed twice fails', () => {
  const problems = checkFiles([...EXPECTED_FILES, 'LICENSE']);
  assert.deepEqual(problems, ['packed twice: LICENSE']);
});

test('the pack of a package without a files list fails on brand assets', () => {
  const problems = checkPack(sampleWithoutFiles, pkg);
  assert.ok(problems.includes('unexpected file in the tarball: theme/logo-geometry.json'));
  assert.ok(problems.includes('unexpected file in the tarball: theme/brand.json'));
  assert.ok(problems.some((p) => p.startsWith('unexpected file in the tarball: project/assets/')));
});

test('empty, malformed or ambiguous pack output fails', () => {
  for (const text of ['', 'npm notice', '{}', '[]', '[{}]', '[{"files":[]}]', '[{"files":[{}]}]', packText(['LICENSE']).replace(/^\[/, '[{"files":[{"path":"x"}]},')]) {
    const problems = checkPack(text, pkg);
    assert.ok(problems.length > 0, `accepted: ${JSON.stringify(text)}`);
  }
});

test('an empty expected list fails instead of passing', () => {
  assert.deepEqual(checkFiles([], []), ['the expected file list is empty']);
});

test('every lifecycle script fails', () => {
  for (const s of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack']) {
    assert.ok(LIFECYCLE_SCRIPTS.includes(s));
    const problems = checkPack(sample, { scripts: { ...pkg.scripts, [s]: 'node x.mjs' } });
    assert.deepEqual(problems, [`package.json has the lifecycle script "${s}"`]);
  }
});

test('the repository package.json has no lifecycle script', () => {
  const real = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(checkLifecycleScripts(real), []);
  assert.deepEqual(checkLifecycleScripts({}), []);
});
