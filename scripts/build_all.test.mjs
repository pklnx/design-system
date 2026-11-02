// Tests of the generation entry point scripts/build_all.mjs (design-system #25): the order
// follows the data dependencies between the scripts, no generator is missing from it, and a
// failing step stops the run with a non-zero exit code. README and CI are checked against
// STEPS in workflows.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, STEPS, commandOf, runSteps } from './build_all.mjs';

const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

test('the steps run in the order of their data dependencies', () => {
  assert.deepEqual(STEPS.map(commandOf), [
    'python3 scripts/build_logo.py',
    'python3 scripts/build_product_logos.py',
    'node scripts/build.mjs',
    'python3 scripts/build_assets.py',
    'node scripts/render_pngs.mjs',
    'node scripts/build_icons.mjs',
  ]);
  for (const [, script] of STEPS) assert.ok(existsSync(path.join(ROOT, script)), `${script} exists`);
});

test('each ordering constraint is a real dependency: the writer writes the file, the reader reads it', () => {
  const index = (script) => STEPS.findIndex(([, s]) => s === `scripts/${script}`);
  // [writer, reader, text in the writer, text in the reader]
  const deps = [
    ['build_logo.py', 'build.mjs', 'theme/logo-geometry.json', 'theme/logo-geometry.json'],
    ['build_logo.py', 'build_assets.py', 'theme/logo-geometry.json', 'theme/logo-geometry.json'],
    ['build.mjs', 'build_assets.py', 'theme/tokens.json', 'theme/tokens.json'],
    ['build_logo.py', 'build_icons.mjs', 'theme/logo-geometry.json', 'theme/logo-geometry.json'],
    ['build_logo.py', 'build_product_logos.py', 'def star_path', 'from build_logo import'],
    ['build_product_logos.py', 'render_pngs.mjs', '-tile.svg', '-tile.svg'],
    ['build_assets.py', 'render_pngs.mjs', 'assets/Social', 'assets/Social'],
  ];
  for (const [writer, reader, inWriter, inReader] of deps) {
    assert.ok(index(writer) >= 0 && index(reader) >= 0, `${writer} and ${reader} are steps`);
    assert.ok(index(writer) < index(reader), `${writer} must run before ${reader}`);
    assert.ok(read(`scripts/${writer}`).includes(inWriter), `${writer} contains ${inWriter}`);
    assert.ok(read(`scripts/${reader}`).includes(inReader), `${reader} contains ${inReader}`);
  }
});

test('every generator script in scripts/ is a step, and nothing else is', () => {
  const generators = readdirSync(path.join(ROOT, 'scripts'))
    .filter((f) => /^(?:build_[a-z_]+\.py|build\.mjs|build_icons\.mjs|render_pngs\.mjs)$/.test(f))
    .map((f) => `scripts/${f}`).sort();
  assert.deepEqual(STEPS.map(([, s]) => s).sort(), generators);
});

test('package.json runs the entry point as build:all, and build is the step build.mjs', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.equal(scripts['build:all'], 'node scripts/build_all.mjs');
  assert.equal(scripts.build, 'node scripts/build.mjs');
});

// A stand-in for spawnSync that records the calls and fails the n-th one.
function fake(failAt, result = { status: 1 }) {
  const calls = [];
  const spawn = (exe, args, opts) => {
    calls.push([exe, ...args]);
    return calls.length === failAt ? result : { status: 0 };
  };
  const out = [];
  return { calls, out, opts: { spawn, log: () => {}, error: (m) => out.push(m) } };
}

test('runSteps runs every step in order with the interpreter from PYTHON, default python3', () => {
  const a = fake(0);
  assert.equal(runSteps(STEPS, { env: { PYTHON: '/venv/bin/python3' }, ...a.opts }), 0);
  assert.deepEqual(a.calls.map(([exe, script]) => [exe === process.execPath ? 'node' : exe, path.relative(ROOT, script)]), [
    ['/venv/bin/python3', 'scripts/build_logo.py'],
    ['/venv/bin/python3', 'scripts/build_product_logos.py'],
    ['node', 'scripts/build.mjs'],
    ['/venv/bin/python3', 'scripts/build_assets.py'],
    ['node', 'scripts/render_pngs.mjs'],
    ['node', 'scripts/build_icons.mjs'],
  ]);
  const b = fake(0);
  runSteps(STEPS, { env: {}, ...b.opts });
  assert.equal(b.calls[0][0], 'python3');
});

test('runSteps stops at the first failing step and returns its non-zero exit code', () => {
  const a = fake(3, { status: 7 });
  assert.equal(runSteps(STEPS, { env: {}, ...a.opts }), 7);
  assert.equal(a.calls.length, 3, 'the steps after the failing one do not run');
  assert.match(a.out[0], /step 3 failed: node scripts\/build\.mjs \(exit 7\)/);
});

test('runSteps fails when a step cannot start or is killed', () => {
  const a = fake(1, { error: new Error('spawn python3 ENOENT'), status: null });
  assert.equal(runSteps(STEPS, { env: {}, ...a.opts }), 1);
  assert.equal(a.calls.length, 1);
  assert.match(a.out[0], /ENOENT/);
  const b = fake(2, { status: null, signal: 'SIGKILL' });
  assert.equal(runSteps(STEPS, { env: {}, ...b.opts }), 1);
  assert.match(b.out[0], /SIGKILL/);
});
