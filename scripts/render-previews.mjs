// Renders every components/<Comp>/preview.html the way the design system page does
// (tokens.css, bundle.css, React 18, bundle.js preloaded, data-theme on <html>) and
// screenshots it in both themes with headless Chromium.
// Usage: CHROME=/path/to/chrome node scripts/render-previews.mjs [Comp ...]   -> .render/<Comp>-<theme>.png
// CHROME is required (no machine-specific default). Exits non-zero when a render fails.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
// React 18 only: the browser gets the UMD builds, which React 19 dropped (no umd/ directory). package.json pins react and react-dom to 18.x (README, "Building"); bundling React instead is what would allow 19.
const react = path.join(ROOT, 'node_modules/react/umd/react.production.min.js');
const reactDom = path.join(ROOT, 'node_modules/react-dom/umd/react-dom.production.min.js');

let failed = 0;
for (const c of comps) {
  const failedBefore = failed;
  const src = fs.readFileSync(path.join(proj, 'components', c, 'preview.html'), 'utf8');
  const marker = /@dsCard([^>]*)-->/.exec(src)?.[1] || '';
  const height = +(/height=(\d+)/.exec(marker)?.[1] || 300);
  const width = +(/width=(\d+)/.exec(marker)?.[1] || 960);
  for (const theme of ['dark', 'light']) {
    const head = `<link rel="stylesheet" href="${fileUrl(path.join(proj, 'tokens.css'))}"><link rel="stylesheet" href="${fileUrl(path.join(proj, 'components/bundle.css'))}">` +
      `<script src="${fileUrl(react)}"></script><script src="${fileUrl(reactDom)}"></script><script src="${fileUrl(path.join(proj, 'components/bundle.js'))}"></script>`;
    const base = `${fileUrl(path.join(proj, 'components', c))}/`;
    const html = src.replace(/<html([^>]*)>/i, `<html$1 data-theme="${theme}">`).replace(/<head>/i, `<head><base href="${base}">${head}`);
    const file = path.join(out, `${c}-${theme}.html`);
    fs.writeFileSync(file, html);
    const png = path.join(out, `${c}-${theme}.png`);
    fs.rmSync(png, { force: true });
    try {
      execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1',
        '--virtual-time-budget=4000', `--window-size=${width},${height}`, `--screenshot=${png}`, fileUrl(file)], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 60000 });
      if (!fs.existsSync(png) || fs.statSync(png).size === 0) throw new Error('Chromium wrote no screenshot');
    } catch (e) {
      failed++;
      console.error(`fail ${c} ${theme}: ${e.message}${e.stderr ? `\n${String(e.stderr).trim().split('\n').slice(-5).join('\n')}` : ''}`);
    }
  }
  if (failed === failedBefore) console.log('rendered', c);
}
if (failed) die(`${failed} render${failed === 1 ? '' : 's'} failed`);
