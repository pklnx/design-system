// Rules every workflow in .github/workflows follows (design-system #6): actions pinned by
// commit SHA, npm without install scripts, IBM's telemetry off where npm runs, one Node
// version (`.node-version`), checkouts without persisted credentials. The composite action
// in .github/actions/setup holds the Node and npm prelude and its pins; the Pages site
// deploys only after the check job of ci.yml passed (design-system #21).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIR = '.github/workflows';
const NODE_VERSION = readFileSync(path.join(ROOT, '.node-version'), 'utf8').trim();
const ACTIONS_DIR = '.github/actions';
const SETUP = './.github/actions/setup';
const workflows = readdirSync(path.join(ROOT, DIR)).filter((f) => /\.ya?ml$/.test(f)).sort()
  .map((f) => ({ name: f, text: readFileSync(path.join(ROOT, DIR, f), 'utf8') }));
const actions = readdirSync(path.join(ROOT, ACTIONS_DIR), { withFileTypes: true }).filter((d) => d.isDirectory())
  .map((d) => d.name).sort()
  .map((n) => ({ name: `${n}/action.yml`, dir: n, text: readFileSync(path.join(ROOT, ACTIONS_DIR, n, 'action.yml'), 'utf8') }));
const sources = [...workflows, ...actions];

// The jobs of a workflow: { name, text }. Text-based like the rest of this file.
const jobsOf = (text) => {
  const start = text.indexOf('\njobs:\n');
  assert.ok(start >= 0, 'a jobs: section');
  return [...text.slice(start + 7).matchAll(/^ {2}([\w-]+):\n([\s\S]*?)(?=^ {2}[\w-]+:\n|(?![\s\S]))/gm)].map((m) => ({ name: m[1], text: m[2] }));
};
const needsOf = (job) => {
  const m = /^ {4}needs: (?:\[([^\]]*)\]|(\S+))$/m.exec(job.text);
  return m ? (m[1] ?? m[2]).split(',').map((s) => s.trim()).filter(Boolean) : [];
};
// Whether `job` waits (directly or through other jobs) for `target`.
const waitsFor = (jobs, job, target, seen = new Set()) => needsOf(job).some((n) => {
  if (n === target) return true;
  if (seen.has(n)) return false;
  seen.add(n);
  const next = jobs.find((j) => j.name === n);
  return next ? waitsFor(jobs, next, target, seen) : false;
});
// Every `uses: owner/repo@sha` of the workflows and the local actions.
const pins = () => sources.flatMap((s) => [...s.text.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@([0-9a-f]{40})/g)].map((m) => ({ file: s.name, action: m[1], sha: m[2] })));

test('the workflows are ci and release, the local action is setup', () => {
  assert.deepEqual(workflows.map((w) => w.name), ['ci.yml', 'release.yml']);
  assert.deepEqual(actions.map((a) => a.dir), ['setup']);
});

test('every action is pinned by commit SHA with its version in a comment', () => {
  for (const w of sources) {
    for (const m of w.text.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/gm)) {
      if (m[1].startsWith('./')) {
        assert.ok(existsSync(path.join(ROOT, m[1], 'action.yml')), `${w.name}: local action ${m[1]} exists`);
        assert.equal(m[2], '', `${w.name}: ${m[1]}`);
        continue;
      }
      assert.match(m[1], /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${w.name}: ${m[1]}`);
      assert.match(m[2], /^ # v\d+\.\d+\.\d+$/, `${w.name}: ${m[1]} has no version comment`);
    }
  }
});

// ---- the pins live in one place (design-system #21)
// actions/checkout runs before a local action can (the action is a file of the repository),
// so each job pins it itself, always to the same SHA. actions/download-artifact is the one
// other repeat: the attest and release jobs must run no repository code, so they cannot use a
// local action that would wrap it (it would need a checkout).
const REPEATED = new Set(['actions/checkout', 'actions/download-artifact']);

test('every pinned action SHA appears once, except the checkout pins (identical everywhere)', () => {
  const byAction = Map.groupBy(pins(), (p) => p.action);
  assert.ok(byAction.size > 5, 'pins found');
  for (const [action, list] of byAction) {
    if (REPEATED.has(action)) {
      assert.equal(new Set(list.map((p) => p.sha)).size, 1, `${action}: all pins identical (${list.map((p) => `${p.file} ${p.sha}`).join(', ')})`);
    } else {
      assert.equal(list.length, 1, `${action} is pinned ${list.length} times (${list.map((p) => p.file).join(', ')}); pin it once, e.g. in a local action`);
    }
  }
  assert.ok(byAction.get('actions/checkout').length >= 3, 'checkout pins found');
  assert.equal(byAction.get('actions/download-artifact').length, 2, 'download-artifact: the attest and the release job');
});

test('the Node prelude is pinned in the setup action only', () => {
  const setup = actions.find((a) => a.dir === 'setup').text;
  assert.match(setup, /^ {4}- uses: actions\/setup-node@[0-9a-f]{40} # v\d+\.\d+\.\d+$/m, 'setup pins actions/setup-node');
  assert.match(setup, /^\s+using: composite$/m);
  for (const w of workflows) assert.doesNotMatch(w.text, /actions\/setup-node@/, `${w.name}: setup-node outside the setup action`);
  assert.doesNotMatch(setup, /actions\/checkout/, 'the setup action does not check out (the caller does, before it)');
});

test('every job that runs npm checks out first and then uses the setup action', () => {
  for (const w of workflows) {
    for (const job of jobsOf(w.text)) {
      if (!/\bnpm (?:run|test|pack|ci)\b/.test(job.text)) continue;
      const checkout = job.text.search(/uses: actions\/checkout@/);
      const setup = job.text.indexOf(`uses: ${SETUP}\n`);
      assert.ok(checkout >= 0 && setup > checkout, `${w.name} ${job.name}: checkout, then ${SETUP}`);
      assert.match(job.text, /IBM_TELEMETRY_DISABLED: 'true'/, `${w.name} ${job.name}: telemetry`);
    }
  }
});

test('npm installs without install scripts, with IBM telemetry off, once, in the setup action', () => {
  for (const s of sources) {
    const installs = [...s.text.matchAll(/\bnpm (?:ci|install|i)\b.*$/gm)].map((m) => m[0]);
    for (const line of installs) assert.match(line, /^npm ci --ignore-scripts$/, `${s.name}: ${line}`);
    assert.equal(installs.length, s.name === 'setup/action.yml' ? 1 : 0, `${s.name}: npm ci lines`);
  }
  const setup = actions.find((a) => a.dir === 'setup').text;
  assert.match(setup, /IBM_TELEMETRY_DISABLED: 'true'/, 'setup: telemetry');
  assert.match(setup, /package-manager-cache: false/, 'setup: no dependency cache');
});

// ---- one place for the Node version (design-system #26)
test('.node-version holds one Node major', () => {
  assert.match(NODE_VERSION, /^\d+$/);
});

test('the setup-node step reads .node-version and nothing names a Node version', () => {
  const setup = actions.find((a) => a.dir === 'setup');
  const steps = [...setup.text.matchAll(/uses: actions\/setup-node@\S+.*\n((?:\s+.*\n){0,4})/g)];
  assert.equal(steps.length, 1, `${setup.name}: one setup-node step`);
  assert.match(steps[0][1], /^\s+node-version-file: \.node-version$/m, `${setup.name}: setup-node without node-version-file: .node-version`);
  for (const s of sources) assert.doesNotMatch(s.text, /^\s*node-version:/m, `${s.name}: literal node-version`);
});

test('package.json devEngines and the README name the Node major of .node-version', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.devEngines.runtime, { name: 'node', version: `>=${NODE_VERSION}`, onFail: 'warn' });
  assert.equal(pkg.engines, undefined, 'engines would bind consumers of the tarball; devEngines does not');
  const building = /^## Building\n([\s\S]*?)^## /m.exec(readFileSync(path.join(ROOT, 'README.md'), 'utf8'));
  assert.ok(building, 'README "Building" section');
  assert.match(building[1], new RegExp(`^Node ${NODE_VERSION}, as declared in \`\\.node-version\``, 'm'), 'README "Building" names Node and .node-version');
});

test('react and react-dom stay on 18.x while the scripts load the UMD builds (README says why)', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const usesUmd = ['build_site.mjs', 'render-previews.mjs'].filter((f) => /node_modules\/react(-dom)?\/umd\//.test(readFileSync(path.join(ROOT, 'scripts', f), 'utf8')));
  assert.deepEqual(usesUmd, ['build_site.mjs', 'render-previews.mjs']);
  for (const name of ['react', 'react-dom']) assert.match(pkg.devDependencies[name], /^(18\.x|~18\.\d+\.\d+)$/, `${name} range`);
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /React 19 dropped the `umd\/` directory/);
});

test('every checkout leaves no credentials behind', () => {
  for (const w of sources) {
    for (const m of w.text.matchAll(/uses: actions\/checkout@\S+.*\n((?:\s+.*\n){0,3})/g)) {
      assert.match(m[1], /persist-credentials: false/, `${w.name}: checkout without persist-credentials: false`);
    }
  }
});

test('release grants no permissions at the top level, ci only contents: read', () => {
  assert.match(workflows.find((x) => x.name === 'release.yml').text, /^permissions: \{\}$/m, 'release.yml');
  assert.match(workflows.find((x) => x.name === 'ci.yml').text, /^permissions:\n {2}contents: read\n/m, 'ci.yml');
});

// ---- Pages deploys only after CI is green on main (design-system #21)
const DEPLOY_IF = /^ {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\) \}\}$/m;

test('ci.yml: the Pages build and deploy jobs wait for the check job and run on main only', () => {
  const text = workflows.find((x) => x.name === 'ci.yml').text;
  assert.doesNotMatch(text, /^\s*workflow_run:/m, 'no workflow_run trigger');
  const jobs = jobsOf(text);
  assert.deepEqual(jobs.map((j) => j.name), ['check', 'pages-build', 'pages-deploy']);
  const [check, build, deploy] = jobs;
  assert.deepEqual(needsOf(check), [], 'the check job waits for nothing');
  assert.deepEqual(needsOf(build), ['check'], 'pages-build needs check');
  assert.ok(waitsFor(jobs, deploy, 'check'), 'pages-deploy waits for check');
  assert.ok(waitsFor(jobs, deploy, 'pages-build'), 'pages-deploy waits for pages-build');
  for (const job of [build, deploy]) {
    assert.match(job.text, DEPLOY_IF, `${job.name}: if is push or dispatch on refs/heads/main`);
    assert.doesNotMatch(job.text, /\b(?:always|failure|cancelled)\(\)/, `${job.name}: no status function that overrides the needs`);
  }
  assert.doesNotMatch(check.text, /^ {4}if:/m, 'the check job runs on every event');
});

test('ci.yml: only the deploy job can write Pages, and it runs no repository code', () => {
  const jobs = jobsOf(workflows.find((x) => x.name === 'ci.yml').text);
  for (const job of jobs.filter((j) => j.name !== 'pages-deploy')) {
    assert.doesNotMatch(job.text, /^ {4}permissions:/m, `${job.name}: inherits contents: read, no own permissions`);
  }
  const deploy = jobs.find((j) => j.name === 'pages-deploy');
  assert.match(deploy.text, /^ {4}permissions:\n {6}pages: write\n {6}id-token: write\n(?! {6}\S)/m, 'exactly pages: write and id-token: write');
  assert.match(deploy.text, /^ {4}environment:\n {6}name: github-pages$/m, 'environment github-pages');
  assert.match(deploy.text, /^ {4}concurrency:\n {6}group: pages$/m, 'concurrency group pages');
  const uses = [...deploy.text.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map((m) => m[1]);
  assert.equal(uses.length, 1, 'one step');
  assert.match(uses[0], /^actions\/deploy-pages@/, 'it only deploys');
  assert.doesNotMatch(deploy.text, /^\s*(?:-\s+)?run:/m, 'no run step');
  assert.doesNotMatch(deploy.text, /checkout/, 'no checkout');
});

test('the Pages build uploads the site artifact and the deploy needs nothing else from the repository', () => {
  const build = jobsOf(workflows.find((x) => x.name === 'ci.yml').text).find((j) => j.name === 'pages-build');
  assert.match(build.text, /run: npm run site\n/);
  assert.match(build.text, /uses: actions\/upload-pages-artifact@\S+.*\n\s+with:\n\s+path: site\n/);
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
