// Writes the Carbon icons the system uses as SVG files (project/assets/Icons), for use outside React.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const I = require('@carbon/icons-react');
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const out = path.join(ROOT, 'project/assets/Icons');
fs.mkdirSync(out, { recursive: true });
const map = { terminal: 'Terminal', server: 'BareMetalServer', mail: 'Email', cloud: 'Cloud', shield: 'Security', key: 'Password', lock: 'Locked', database: 'DataBase', globe: 'Earth', 'arrow-right': 'ArrowRight', external: 'Launch', check: 'Checkmark', close: 'Close', copy: 'Copy' };
for (const [name, comp] of Object.entries(map)) {
  let svg = renderToStaticMarkup(React.createElement(I[comp], { size: 32 }));
  svg = (svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')).replace(/fill="currentColor"/, 'fill="#161616"').replace(/ aria-hidden="true"/, '');
  fs.writeFileSync(path.join(out, `${name}.svg`), svg + '\n');
}
fs.writeFileSync(path.join(out, 'star.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path fill="#8a3ffc" d="M10.8 2 L13.2 2 L15.4 8.6 L22 10.8 L22 13.2 L15.4 15.4 L13.2 22 L10.8 22 L8.6 15.4 L2 13.2 L2 10.8 L8.6 8.6 Z"/></svg>\n');
console.log('icons', Object.keys(map).length + 1);
