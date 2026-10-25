// Captures what theme/vitepress.css has to know about VitePress's default theme into
// scripts/fixtures/vitepress-<version>.json, which the tests read (no network in tests).
//
// Run it by hand when the products upgrade VitePress (they pin it exactly), from the
// repository root, on the unpacked npm tarball:
//
//   dir="$(mktemp -d)"
//   (cd "$dir" && npm pack vitepress@2.0.0-alpha.20 && tar -xzf vitepress-2.0.0-alpha.20.tgz)
//   node scripts/capture-vitepress-fixture.mjs "$dir/package"
//
// Then set VITEPRESS_VERSION in scripts/vitepress-map.mjs, delete the old fixture and
// run `npm test`: every new VitePress rule that sets a corner, an outline or a font
// fails the tests until scripts/vitepress-map.mjs overrides it or keeps it with a reason.
//
// It reads, under dist/client/theme-default/:
//   styles/vars.css           every --vp-* custom property, per selector
//   components/*.vue          every <style> block, with its scoped flag (the theme ships
//                             SFC sources, not compiled component CSS)
//   styles/**/*.css           with the @layer name where there is one
// and records every rule that sets a corner (border-radius and its longhands), an outline
// (outline, outline-style, outline-width), a font (font-family, font), box-shadow or a
// border (border, border-left, border-inline, border-inline-start and their -color,
// -width and -style); the corner, outline and font properties are CLASSIFIED_GROUPS in
// scripts/vitepress-map.mjs:
// file, line, selector, media condition, scoped, layer, !important, specificity (scoped
// rules get Vue's [data-v-…] attribute, +(0,1,0)) and whether the component is loaded
// async (its CSS then arrives after theme/vitepress.css). It also records the static
// classes of each component's root element (componentRoots): a scoped rule styles that
// element or one inside it, so the tests read the root as the rule's ancestor.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCss, specificity, splitTopLevel } from './css-selectors.mjs';
import { CLASSIFIED } from './vitepress-map.mjs';

// Border properties are recorded too: theme/vitepress.css gives custom blocks a left
// stripe, and the tests check every border rule that reaches a custom block.
const BORDERS = ['', '-left', '-inline', '-inline-start'].flatMap((side) => ['', '-color', '-width', '-style'].map((part) => `border${side}${part}`));
export const PROPERTIES = [...CLASSIFIED, 'box-shadow', ...BORDERS];

const listFiles = (dir, ext) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return listFiles(p, ext);
  return d.name.endsWith(ext) ? [p] : [];
});

// Component files a component loads with defineAsyncComponent(() => import('./X.vue')).
function asyncComponents(themeDir) {
  const found = new Set();
  for (const f of [...listFiles(themeDir, '.vue'), ...listFiles(themeDir, '.js')]) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/defineAsyncComponent\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+\.vue)["']\s*\)\s*\)/g)) {
      found.add(path.relative(themeDir, path.resolve(path.dirname(f), m[1])).split(path.sep).join('/'));
    }
  }
  return [...found].sort();
}

// The static classes of a component's root element: the first element of its <template>,
// inside the built-in wrappers (Teleport, Transition, ClientOnly). A scoped rule of the
// component styles that element or one inside it.
const WRAPPERS = new Set(['Teleport', 'Transition', 'ClientOnly']);
function rootClasses(src) {
  const template = /<template>([\s\S]*)<\/template>/.exec(src)?.[1] ?? '';
  for (const m of template.matchAll(/<([A-Za-z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    if (WRAPPERS.has(m[1])) continue;
    return (/\sclass="([^"]*)"/.exec(m[2])?.[1] ?? '').split(/\s+/).filter(Boolean);
  }
  return [];
}

// The <style> blocks of a .vue file, with their CSS and the line their content starts on.
function styleBlocks(src) {
  const blocks = [];
  for (const m of src.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    if (/\b(lang|module|src)\b/.test(m[1])) throw new Error(`unsupported <style${m[1]}>`);
    const startLine = src.slice(0, m.index).split('\n').length; // line of <style>
    blocks.push({ scoped: /\bscoped\b/.test(m[1]), css: m[2], lineOffset: startLine - 1 });
  }
  return blocks;
}

export function capture(pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  if (pkg.name !== 'vitepress') throw new Error(`${pkgDir} is not the vitepress package`);
  const themeDir = path.join(pkgDir, 'dist/client/theme-default');
  const rel = (f) => path.relative(themeDir, f).split(path.sep).join('/');
  const asyncFiles = asyncComponents(themeDir);

  // vars.css: the custom properties per selector (selectors kept as written).
  const varsFile = path.join(themeDir, 'styles/vars.css');
  const vars = {};
  for (const r of parseCss(fs.readFileSync(varsFile, 'utf8')).rules) {
    const names = r.decls.map((d) => d.prop).filter((p) => p.startsWith('--'));
    if (!names.length) continue;
    const key = r.media ? `@media ${r.media} { ${r.selector} }` : r.selector;
    vars[key] = [...new Set([...(vars[key] ?? []), ...names])].sort();
  }

  // The root classes of every component.
  const roots = {};
  for (const f of listFiles(path.join(themeDir, 'components'), '.vue').sort()) {
    const classes = rootClasses(fs.readFileSync(f, 'utf8'));
    if (classes.length) roots[rel(f)] = classes;
  }

  const sources = [
    ...listFiles(path.join(themeDir, 'components'), '.vue').map((f) => ({ f, blocks: styleBlocks(fs.readFileSync(f, 'utf8')) })),
    ...listFiles(path.join(themeDir, 'styles'), '.css').map((f) => ({ f, blocks: [{ scoped: false, css: fs.readFileSync(f, 'utf8'), lineOffset: 0 }] })),
  ].sort((a, b) => rel(a.f).localeCompare(rel(b.f)));

  const rules = [];
  for (const { f, blocks } of sources) {
    const file = rel(f);
    for (const b of blocks) {
      for (const r of parseCss(b.css).rules) {
        for (const d of r.decls) {
          if (!PROPERTIES.includes(d.prop)) continue;
          if (r.parents.length) throw new Error(`${file}:${r.line + b.lineOffset}: nested rule sets ${d.prop}; extend the capture`);
          for (const selector of splitTopLevel(r.selector, ',')) {
            rules.push({
              file,
              line: r.line + b.lineOffset,
              selector: selector.replace(/\s+/g, ' '),
              property: d.prop,
              value: d.value,
              important: d.important,
              media: r.media,
              layer: r.layer,
              scoped: b.scoped,
              async: asyncFiles.includes(file),
              specificity: specificity(selector, { scoped: b.scoped }),
            });
          }
        }
      }
    }
  }
  return {
    source: `npm pack vitepress@${pkg.version}, dist/client/theme-default (captured by scripts/capture-vitepress-fixture.mjs)`,
    version: pkg.version,
    properties: PROPERTIES,
    asyncComponents: asyncFiles,
    componentRoots: roots,
    vars,
    rules,
  };
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/capture-vitepress-fixture.mjs <unpacked vitepress package dir>');
    process.exit(2);
  }
  const data = capture(path.resolve(dir));
  const out = fileURLToPath(new URL(`./fixtures/vitepress-${data.version}.json`, import.meta.url));
  fs.writeFileSync(out, `${JSON.stringify(data, null, 1)}\n`);
  console.log(`${path.relative(process.cwd(), out)}: ${data.rules.length} rules, ${Object.keys(data.vars).length} variable blocks, async ${data.asyncComponents.join(', ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
