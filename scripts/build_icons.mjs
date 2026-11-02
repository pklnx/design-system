// Writes the Carbon icons the system uses as SVG files (project/assets/Icons), for use outside React.
// Usage: node scripts/build_icons.mjs [output-dir]   (default: project/assets/Icons; the tests write into a temp dir)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const I = require('@carbon/icons-react');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'project/assets/Icons');
// The colours and the star come from the brand sources, not from this script: the Icons sit on White, so
// they take the light ink (text-primary White) and the light star colour.
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const { ink, star: starFill } = readJson('theme/brand.json').logo.light;
const { star: starPath, viewBox: starViewBox } = readJson('theme/logo-geometry.json').icon;
fs.mkdirSync(out, { recursive: true });
const map = { terminal: 'Terminal', server: 'BareMetalServer', mail: 'Email', cloud: 'Cloud', shield: 'Security', key: 'Password', lock: 'Locked', database: 'DataBase', globe: 'Earth', 'arrow-right': 'ArrowRight', external: 'Launch', check: 'Checkmark', close: 'Close', copy: 'Copy' };
for (const [name, comp] of Object.entries(map)) {
  let svg = renderToStaticMarkup(React.createElement(I[comp], { size: 32 }));
  svg = (svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')).replace(/fill="currentColor"/, `fill="${ink}"`).replace(/ aria-hidden="true"/, '');
  fs.writeFileSync(path.join(out, `${name}.svg`), svg + '\n');
}
fs.writeFileSync(path.join(out, 'star.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${starViewBox}" width="32" height="32"><path fill="${starFill}" d="${starPath}"/></svg>\n`);
console.log('icons', Object.keys(map).length + 1);
