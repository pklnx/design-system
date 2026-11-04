// Renders every components/<Comp>/preview.html the way the design system page does
// (tokens.css, bundle.css, the React of node_modules, bundled, bundle.js preloaded, data-theme on <html>) and
// screenshots it in both themes with headless Chromium.
// Usage: CHROME=/path/to/chrome node scripts/render-previews.mjs [Comp ...]   -> .render/<Comp>-<theme>.png
// CHROME is required (no machine-specific default). Exits non-zero when a render fails: Chromium fails or writes no
// screenshot, or the page has an uncaught error, an unhandled rejection, a console.error call or a script, stylesheet or
// image that fails to load. Console warnings do not fail a render. It renders every preview and lists all failures,
// each with its preview and theme, before it exits.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REACT_FILE, bundleReact } from './react-bundle.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const proj = path.join(ROOT, 'project');
const out = path.join(ROOT, '.render');

function die(message) {
  console.error(`render-previews: ${message}`);
  process.exit(1);
}

const chrome = process.env.CHROME;
if (!chrome) die('set CHROME to the path of a Chromium or Chrome executable, e.g. CHROME=/usr/bin/chromium node scripts/render-previews.mjs');
try {
  if (!fs.statSync(chrome).isFile()) throw new Error('not a file');
  fs.accessSync(chrome, fs.constants.X_OK);
} catch {
  die(`CHROME=${chrome} is not an executable file`);
}

const available = fs.readdirSync(path.join(proj, 'components')).filter((d) => fs.existsSync(path.join(proj, 'components', d, 'preview.html')));
const comps = process.argv.slice(2).length ? process.argv.slice(2) : available;
const unknown = comps.filter((c) => !available.includes(c));
if (unknown.length) die(`no preview.html for: ${unknown.join(', ')}`);

fs.mkdirSync(out, { recursive: true });
const fileUrl = (p) => pathToFileURL(p).href;
// React and ReactDOM as one classic script that sets the globals bundle.js reads (scripts/react-bundle.mjs), written to .render/lib/react.js.
const react = path.join(out, REACT_FILE);
const { contents: reactBundle } = await bundleReact(ROOT).catch((e) => die(e.message));
fs.mkdirSync(path.dirname(react), { recursive: true });
fs.writeFileSync(react, reactBundle);

// What a page reports, through console.log lines that start with REPORT. Chromium writes console output to stderr with
// --enable-logging=stderr, but every level as INFO, so the page itself tells console.error apart. pageReporter is the
// first script of every page, before the stylesheets; its first report, "ready", shows that the reporting ran and reached stderr, and a render
// without it fails, so a Chromium that stops logging the console cannot pass a broken page.
const REPORT = 'pklnx-render-report:';
function pageReporter(mark) {
  const log = console.log.bind(console);
  const consoleError = console.error;
  const report = (kind, message) => log(mark + JSON.stringify([kind, String(message).slice(0, 1000)]));
  console.error = function (...args) {
    consoleError.apply(console, args);
    report('console error', args.map(String).join(' '));
  };
  addEventListener('error', (e) => {
    if (e instanceof ErrorEvent) report('page error', `${e.message} (${e.filename}:${e.lineno})`);
    else if (e.target && e.target !== window) report('failed to load', `<${e.target.localName}> ${e.target.src || e.target.href || ''}`);
  }, true);
  addEventListener('unhandledrejection', (e) => report('page error', `Uncaught (in promise) ${e.reason}`));
  report('ready', '');
}
const reporter = `<script>(${pageReporter})(${JSON.stringify(REPORT)});</script>`;

// The reports in Chromium's stderr: `... "<REPORT>["kind","message"]", source: <url> (<line>)`.
function pageReports(stderr) {
  const reports = [];
  for (const line of stderr.split('\n')) {
    const at = line.indexOf(REPORT);
    const json = at < 0 ? null : /^(\[.*\])", source: /.exec(line.slice(at + REPORT.length))?.[1];
    if (!json) continue;
    try {
      const [kind, message] = JSON.parse(json);
      reports.push({ kind, message });
    } catch {
      // A line a preview logged itself that only looks like a report.
    }
  }
  return reports;
}

let failed = 0;
for (const c of comps) {
  const failedBefore = failed;
  const src = fs.readFileSync(path.join(proj, 'components', c, 'preview.html'), 'utf8');
  const marker = /@dsCard([^>]*)-->/.exec(src)?.[1] || '';
  const height = +(/height=(\d+)/.exec(marker)?.[1] || 300);
  const width = +(/width=(\d+)/.exec(marker)?.[1] || 960);
  for (const theme of ['dark', 'light']) {
    const head = `${reporter}<link rel="stylesheet" href="${fileUrl(path.join(proj, 'tokens.css'))}"><link rel="stylesheet" href="${fileUrl(path.join(proj, 'components/bundle.css'))}">` +
      `<script src="${fileUrl(react)}"></script><script src="${fileUrl(path.join(proj, 'components/bundle.js'))}"></script>`;
    const base = `${fileUrl(path.join(proj, 'components', c))}/`;
    const html = src.replace(/<html([^>]*)>/i, `<html$1 data-theme="${theme}">`).replace(/<head>/i, `<head><base href="${base}">${head}`);
    const file = path.join(out, `${c}-${theme}.html`);
    fs.writeFileSync(file, html);
    const png = path.join(out, `${c}-${theme}.png`);
    fs.rmSync(png, { force: true });
    const r = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1',
      '--enable-logging=stderr', '--virtual-time-budget=4000', `--window-size=${width},${height}`, `--screenshot=${png}`, fileUrl(file)],
      { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
    const stderr = r.stderr || '';
    const tail = stderr.trim() ? `\n${stderr.trim().split('\n').slice(-5).join('\n')}` : '';
    let problems;
    if (r.error) problems = [`${r.error.message}${tail}`];
    else if (r.status !== 0) problems = [`Chromium exited with ${r.status ?? r.signal}${tail}`];
    else if (!fs.existsSync(png) || fs.statSync(png).size === 0) problems = [`Chromium wrote no screenshot${tail}`];
    else {
      const reports = pageReports(stderr);
      problems = reports.filter((p) => p.kind !== 'ready').map((p) => `${p.kind}: ${p.message}`);
      if (!reports.some((p) => p.kind === 'ready')) problems.push('the page reported nothing (its error reporting did not run, or Chromium logged no console output to stderr)');
    }
    if (problems.length) {
      failed++;
      for (const p of problems) console.error(`fail ${c} ${theme}: ${p}`);
    }
  }
  if (failed === failedBefore) console.log('rendered', c);
}
if (failed) die(`${failed} render${failed === 1 ? '' : 's'} failed`);
