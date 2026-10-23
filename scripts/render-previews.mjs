// Renders every components/<Comp>/preview.html the way the design system page does
// (tokens.css, bundle.css, React 18, bundle.js preloaded, data-theme on <html>) and
// screenshots it in both themes with headless Chromium.
// Usage: node scripts/render-previews.mjs [Comp ...]   -> .render/<Comp>-<theme>.png
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const proj = path.join(ROOT, 'project');
const out = path.join(ROOT, '.render');
fs.mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME || '/opt/pw-browsers/chromium';
const comps = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(proj, 'components')).filter((d) => fs.existsSync(path.join(proj, 'components', d, 'preview.html')));
const react = path.join(ROOT, 'node_modules/react/umd/react.production.min.js');
const reactDom = path.join(ROOT, 'node_modules/react-dom/umd/react-dom.production.min.js');

for (const c of comps) {
  const src = fs.readFileSync(path.join(proj, 'components', c, 'preview.html'), 'utf8');
  const marker = /@dsCard([^>]*)-->/.exec(src)?.[1] || '';
  const height = +(/height=(\d+)/.exec(marker)?.[1] || 300);
  const width = +(/width=(\d+)/.exec(marker)?.[1] || 960);
  for (const theme of ['dark', 'light']) {
    const head = `<link rel="stylesheet" href="file://${proj}/tokens.css"><link rel="stylesheet" href="file://${proj}/components/bundle.css">` +
      `<script src="file://${react}"></script><script src="file://${reactDom}"></script><script src="file://${proj}/components/bundle.js"></script>`;
    let html = src.replace(/<html([^>]*)>/i, `<html$1 data-theme="${theme}">`).replace(/<head>/i, `<head><base href="file://${proj}/components/${c}/">${head}`);
    const file = path.join(out, `${c}-${theme}.html`);
    fs.writeFileSync(file, html);
    const png = path.join(out, `${c}-${theme}.png`);
    try {
      execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1',
        '--virtual-time-budget=4000', `--window-size=${width},${height}`, `--screenshot=${png}`, `file://${file}`], { stdio: 'ignore', timeout: 60000 });
    } catch (e) { console.log('fail', c, theme); }
  }
  console.log('rendered', c);
}
