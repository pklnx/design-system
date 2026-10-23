// Renders the PNGs of the product logos and social images from their SVGs with resvg,
// and writes project/assets/Logos/products/manifest.json.
//
//   node scripts/render_pngs.mjs
//
// Run last: after build_product_logos.py (icons) and build_assets.py (social images).
// Each PNG carries the sha256 of its source SVG in a tEXt chunk (SOURCE_KEY), and the
// manifest lists every PNG with its size, source, source sha256 and PNG sha256, so the
// tests catch a PNG that was not rendered again after its SVG changed.

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { withText } from './png.mjs';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const PRODUCTS_DIR = 'project/assets/Logos/products';
export const MANIFEST = `${PRODUCTS_DIR}/manifest.json`;
export const SOURCE_KEY = 'pklnx:source-sha256';
export const PRODUCTS = ['mail-archive', 'paperless-go'];

// [png, source svg, width in px]; the height follows from the SVG's aspect ratio.
export const JOBS = PRODUCTS.flatMap((p) => [
  [`${PRODUCTS_DIR}/${p}-favicon-32.png`, `${PRODUCTS_DIR}/${p}-tile.svg`, 32],
  [`${PRODUCTS_DIR}/${p}-icon-192.png`, `${PRODUCTS_DIR}/${p}-tile.svg`, 192],
  [`${PRODUCTS_DIR}/${p}-icon-512.png`, `${PRODUCTS_DIR}/${p}-tile.svg`, 512],
  [`${PRODUCTS_DIR}/${p}-apple-touch-icon.png`, `${PRODUCTS_DIR}/${p}-apple-touch-icon.svg`, 180],
  [`${PRODUCTS_DIR}/${p}-icon-maskable-512.png`, `${PRODUCTS_DIR}/${p}-icon-maskable.svg`, 512],
  [`project/assets/Social/${p}-social.png`, `project/assets/Social/${p}-social.svg`, 1280],
]);

const RESVG_VERSION = createRequire(import.meta.url)('@resvg/resvg-js/package.json').version;

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Renders an SVG (text) at the given width; system fonts are off, the SVGs have none.
export function render(svg, width) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } });
  const img = r.render();
  return { png: img.asPng(), width: img.width, height: img.height };
}

function main() {
  const entries = [];
  for (const [out, source, width] of JOBS) {
    const svg = readFileSync(path.join(ROOT, source));
    const sourceSha = sha256(svg);
    const img = render(svg.toString('utf8'), width);
    const png = withText(img.png, SOURCE_KEY, sourceSha);
    writeFileSync(path.join(ROOT, out), png);
    entries.push({ path: out, width: img.width, height: img.height, source, sourceSha256: sourceSha, sha256: sha256(png) });
  }
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(path.join(ROOT, MANIFEST), `${JSON.stringify({ renderer: `@resvg/resvg-js ${RESVG_VERSION}`, pngs: entries }, null, 2)}\n`);
  console.log(`render_pngs: ${entries.length} PNGs, ${MANIFEST}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
