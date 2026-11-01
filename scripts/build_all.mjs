// The one entry point that generates every committed generated file, in the one order that
// matches their data dependencies (design-system #25). README "Building" and the CI step
// "Generated files are committed" both call it; neither lists the steps itself.
//
//   npm run build:all
//
// The Python scripts run with the interpreter in the PYTHON environment variable
// (default: python3), for example PYTHON=.venv/bin/python3 npm run build:all.
//
// Order, and why:
//   1. build_logo.py          writes theme/logo-geometry.json (needs the fonts in node_modules)
//   2. build_product_logos.py imports build_logo.py; writes the product SVGs
//   3. build.mjs              reads theme/logo-geometry.json; writes theme/tokens.json, the themes, bundles
//   4. build_assets.py        reads theme/tokens.json and theme/logo-geometry.json; writes patterns and social SVGs
//   5. render_pngs.mjs        renders the product icon and social SVGs to PNG; writes products/manifest.json
//   6. build_icons.mjs        writes the Carbon icon SVGs (needs nothing from the steps above)
//
// Each step reads files an earlier step wrote, so a clean run is consistent. The order does not
// make a checkout self-sufficient: all intermediate files (theme/logo-geometry.json,
// theme/tokens.json, the SVGs) are committed, so a step run out of order still finds an input
// and only produces stale output. CI therefore runs this script in this order and fails when
// the tree changes. The script stops at the first failing step and exits non-zero.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// [interpreter, script]; 'python' stands for $PYTHON (default python3), 'node' for this Node.
export const STEPS = [
  ['python', 'scripts/build_logo.py'],
  ['python', 'scripts/build_product_logos.py'],
  ['node', 'scripts/build.mjs'],
  ['python', 'scripts/build_assets.py'],
  ['node', 'scripts/render_pngs.mjs'],
  ['node', 'scripts/build_icons.mjs'],
];

// The step as the command a person types: python3 scripts/build_logo.py, node scripts/build.mjs.
export const commandOf = ([interpreter, script]) => `${interpreter === 'python' ? 'python3' : 'node'} ${script}`;

// Runs the steps in order and returns the exit code: 0, or the first failing step's code (1 when
// it could not start or was killed). `spawn` is injectable for the tests.
export function runSteps(steps, { env = process.env, spawn = spawnSync, log = console.log, error = console.error } = {}) {
  const python = env.PYTHON || 'python3';
  for (const [i, step] of steps.entries()) {
    const exe = step[0] === 'python' ? python : process.execPath;
    log(`build:all [${i + 1}/${steps.length}] ${commandOf(step)}`);
    const r = spawn(exe, [path.join(ROOT, step[1])], { cwd: ROOT, stdio: 'inherit', env });
    if (r.error || r.status !== 0) {
      error(`build:all: step ${i + 1} failed: ${commandOf(step)}${r.error ? ` (${r.error.message})` : ` (exit ${r.status ?? r.signal})`}`);
      return r.status || 1;
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(runSteps(STEPS));
