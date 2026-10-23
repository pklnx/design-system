// Builds everything from the Carbon packages and theme/brand.json:
//   theme/          the Carbon theme for code (CSS and SCSS overrides, tokens as JSON)
//   project/        the files of the claude.ai Design System artifact
// Run: npm run build   (the logo is built separately: python3 scripts/build_logo.py)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as sass from 'sass';
import * as esbuild from 'esbuild';
import { noteFor } from './token-notes.mjs';

const require = createRequire(import.meta.url);
const themes = require('@carbon/themes');
const colors = require('@carbon/colors');
const type = require('@carbon/type');
const layout = require('@carbon/layout');

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const P = (...p) => path.join(ROOT, ...p);
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const brand = JSON.parse(fs.readFileSync(P('theme/brand.json'), 'utf8'));
const kebab = themes.formatTokenName;

// ---------------------------------------------------------------- colors
// Every Carbon color token for White (light) and G100 (dark), theme and component tokens.
const THEMES = { light: { carbon: themes.white, key: 'whiteTheme', cls: 'cds--white' }, dark: { carbon: themes.g100, key: 'g100', cls: 'cds--g100' } };
const isColor = (v) => typeof v === 'string' && /^(#|rgba?\()/i.test(v.trim());
const all = { light: {}, dark: {} };
for (const [id, t] of Object.entries(THEMES)) {
  for (const [k, v] of Object.entries(t.carbon)) if (isColor(v)) all[id][kebab(k)] = v.toLowerCase();
  for (const group of ['buttonTokens', 'notificationTokens', 'contentSwitcherTokens', 'tagTokens', 'statusTokens']) {
    for (const [k, v] of Object.entries(themes[group])) if (isColor(v[t.key])) all[id][kebab(k)] = v[t.key].toLowerCase();
  }
}

// Brand: Carbon's interactive Blue becomes the primary hue, step for step.
const hue = brand.primary; // "purple"
const swap = {};
for (const [k, v] of Object.entries(colors)) {
  const m = /^blue(\d+)(Hover)?$/.exec(k);
  if (m && typeof v === 'string') swap[v.toLowerCase()] = colors[`${hue}${m[1]}${m[2] || ''}`].toLowerCase();
}
// Status, syntax, AI, tags and data colors keep their Carbon meaning.
const keep = /^(support-|syntax-|ai-|tag-|status-|notification-background-info)/;
const changed = { light: {}, dark: {} };
for (const id of ['light', 'dark']) {
  for (const [name, v] of Object.entries(all[id])) {
    if (keep.test(name)) continue;
    if (swap[v]) { all[id][name] = swap[v]; changed[id][name] = swap[v]; }
  }
}
// Visited links: Purple is now the link color, so visited goes Blue.
const visited = { light: { 'link-visited': colors.blue70, 'link-inverse-visited': colors.blue40 }, dark: { 'link-visited': colors.blue30, 'link-inverse-visited': colors.blue60 } };
for (const id of ['light', 'dark']) for (const [n, v] of Object.entries(visited[id])) { all[id][n] = v.toLowerCase(); changed[id][n] = v.toLowerCase(); }
// The star of the logo.
for (const id of ['light', 'dark']) { all[id].star = brand.logo[id].star; changed[id].star = brand.logo[id].star; }

// Tokens the design system page lists (the rest stay in the bundle as plain Carbon values).
const listed = (n) => !/^(syntax-|ai-|chat-|tag-|status-)/.test(n);
const order = Object.keys(all.light).filter(listed);
// Group order on the page: by stem, Carbon's own reading order.
const stems = ['background', 'layer', 'field', 'border', 'text', 'link', 'icon', 'support', 'focus', 'interactive', 'highlight', 'button', 'notification', 'content', 'overlay', 'shadow', 'skeleton', 'toggle', 'star'];
const stemOf = (n) => stems.findIndex((s) => n === s || n.startsWith(s + '-'));
order.sort((a, b) => (stemOf(a) - stemOf(b)) || 0);

// ---------------------------------------------------------------- contrast check
function lum(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
  const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); if (x == null || y == null) return null; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pairs = [
  ['text-primary', ['background', 'layer-01', 'layer-02', 'field-01'], 4.5],
  ['text-secondary', ['background', 'layer-01', 'layer-02', 'field-01'], 4.5],
  ['text-helper', ['background', 'layer-01', 'layer-02'], 4.5],
  ['text-error', ['background', 'layer-01'], 4.5],
  ['link-primary', ['background', 'layer-01', 'layer-02'], 4.5],
  ['link-primary-hover', ['background', 'layer-01'], 4.5],
  ['text-on-color', ['button-primary', 'button-primary-hover', 'background-brand', 'button-danger-primary'], 4.5],
  ['focus', ['background', 'layer-01', 'layer-02'], 3],
  ['border-strong-01', ['background', 'layer-01'], 3],
  ['icon-primary', ['background', 'layer-01'], 3],
  ['icon-secondary', ['background', 'layer-01'], 3],
  ['star', ['background', 'layer-01'], 3],
  ['support-success', ['background', 'layer-01'], 3],
  ['support-warning', ['background', 'layer-01'], 3],
  ['support-error', ['background', 'layer-01'], 3],
  ['text-placeholder', ['field-01'], 4.5],
];
const report = [];
for (const id of ['dark', 'light']) for (const [fg, grounds, min] of pairs) for (const g of grounds) {
  const r = ratio(all[id][fg], all[id][g]);
  if (r != null) report.push({ theme: id, fg, ground: g, ratio: Math.round(r * 100) / 100, min, ok: r >= min });
}
write(P('theme/contrast-report.json'), JSON.stringify(report, null, 1) + '\n');
const failing = report.filter((r) => !r.ok);

// ---------------------------------------------------------------- type
const sansStack = type.fontFamilies.sans;
const monoStack = type.fontFamilies.mono;
const styleOf = (key, extra = {}) => {
  const s = type.styles[key];
  const o = { fontSize: s.fontSize, lineHeight: Number(s.lineHeight.toFixed ? s.lineHeight.toFixed(5) : s.lineHeight), fontWeight: s.fontWeight };
  if (s.letterSpacing && s.letterSpacing !== 0) o.letterSpacing = s.letterSpacing;
  return Object.assign(o, extra);
};
const typeGroups = [
  { name: 'Headings', family: 'sans', styles: [
    ['heading-07', 'heading07', 'Infrastruktur, die läuft', 'Largest heading: page hero, title page. One per page.'],
    ['heading-06', 'heading06', 'Mailserver und Backups', 'Hero on sub pages, large figures.'],
    ['heading-05', 'heading05', 'Leistungen', 'Page titles.'],
    ['heading-04', 'heading04', 'Hosting für kleine Unternehmen', 'Section titles.'],
    ['heading-03', 'heading03', 'hermes.pklnx.space', 'Titles of tiles and dialogs.'],
    ['heading-compact-02', 'headingCompact02', 'Rechnung 2026-014', 'Small heading in dense areas, table headers in documents.'],
    ['heading-compact-01', 'headingCompact01', 'Leistungszeitraum', 'Smallest heading: form groups, column headers.'],
  ] },
  { name: 'Text', family: 'sans', styles: [
    ['body-02', 'body02', 'Ich betreibe Mailserver, Backups und Hosting für kleine Unternehmen in Lippstadt und Umgebung.', 'Body copy on web pages. At most 68 characters per line.'],
    ['body-01', 'body01', 'Die Sicherung läuft jede Nacht und wird 30 Tage aufbewahrt.', 'Body copy in dense areas, tile text, invoice items.'],
    ['body-compact-02', 'bodyCompact02', 'Anfrage senden', 'Single-line 16px text: large buttons, navigation.'],
    ['body-compact-01', 'bodyCompact01', 'Leistungen ansehen', 'Single-line UI text: buttons, menus, table cells.'],
    ['label-01', 'label01', 'Rechnungsnummer', 'Field labels, metadata, column labels.'],
    ['helper-text-01', 'helperText01', 'Vollständige Domain, zum Beispiel firma.de', 'Helper text below fields.'],
    ['legal-01', 'legal01', 'Steuernummer [STEUERNUMMER] · USt-IdNr. [UST-ID]', 'Small print, footers, bank details. Not below 7 pt in print.'],
  ] },
  { name: 'Code', family: 'mono', styles: [
    ['code-02', 'code02', 'restic -r s3:backup backup /srv', 'Code blocks.'],
    ['code-01', 'code01', 'hermes.pklnx.space', 'Host names, paths and commands in running text.'],
  ] },
];
const typeTokens = {
  fonts: [
    ['IBM Plex Sans', 'IBMPlexSans-Light.woff2', '300', 'plex-sans'],
    ['IBM Plex Sans', 'IBMPlexSans-Regular.woff2', '400', 'plex-sans'],
    ['IBM Plex Sans', 'IBMPlexSans-Italic.woff2', '400', 'plex-sans', 'italic'],
    ['IBM Plex Sans', 'IBMPlexSans-SemiBold.woff2', '600', 'plex-sans'],
    ['IBM Plex Mono', 'IBMPlexMono-Regular.woff2', '400', 'plex-mono'],
    ['IBM Plex Mono', 'IBMPlexMono-SemiBold.woff2', '600', 'plex-mono'],
  ].map(([family, file, weight, pkg, style]) => {
    const src = P('node_modules/@ibm', pkg, 'fonts/complete/woff2', file);
    fs.mkdirSync(P('project/fonts'), { recursive: true });
    fs.copyFileSync(src, P('project/fonts', file));
    const f = { family, file: `fonts/${file}`, weight };
    if (style) f.style = style;
    return f;
  }),
  families: { sans: sansStack.replace(/'/g, '"'), mono: monoStack.replace(/'/g, '"') },
  groups: typeGroups.map((g) => ({ name: g.name, family: g.family, styles: g.styles.map(([name, key, sample, usage]) => ({ name, ...styleOf(key), sample, usage })) })),
};
// The brand's one own style: the shell prompt heading.
typeTokens.groups[2].styles.push({ name: 'prompt', family: 'mono', fontSize: '1.75rem', lineHeight: 1.28572, fontWeight: 600, sample: '$ ls ./services', usage: 'Section headings as a shell prompt (component Prompt). The `$` in `star`.' });

// ---------------------------------------------------------------- spacing, size, radius
const spaceNotes = ['Hairline gaps, icon to badge.', 'Icon to text.', 'Tight groups, tag padding.', 'Vertical padding in fields.', 'Mobile page margin, padding of tiles and buttons.', 'Gap between items of a group.', 'Gap between tiles, desktop page margin.', 'Gap between groups.', 'Gap between sections on mobile.', 'Gap between sections on desktop.', 'Large section gap.', 'Top and bottom margin of the hero.', 'Largest gap, hero areas only.'];
const spacing = { tokens: layout.spacing.map((v, i) => ({ name: `spacing-${String(i + 1).padStart(2, '0')}`, value: v, usage: spaceNotes[i] })) };
const sizeNotes = { XSmall: ['size-xs', 'Smallest control height: small tags.'], Small: ['size-sm', 'Compact buttons and fields in dense tables.'], Medium: ['size-md', 'Buttons and fields in forms.'], Large: ['size-lg', 'Default height for buttons and fields on the web, touch included.'], XLarge: ['size-xl', 'Large buttons in the hero.'], '2XLarge': ['size-2xl', 'Largest control height.'] };
const size = { note: 'Control heights from Carbon. Touch targets at least `size-lg`.', tokens: [
  ...Object.entries(layout.sizes).map(([k, v]) => ({ name: sizeNotes[k][0], value: v, usage: sizeNotes[k][1] })),
  { name: 'icon-size-01', value: layout.iconSize01, usage: 'Icons next to text and in buttons.' },
  { name: 'icon-size-02', value: layout.iconSize02, usage: 'Icons on their own or in the header.' },
] };
const radius = { note: 'Carbon is square. Rounding only for the three exceptions here.', tokens: [
  { name: 'radius-none', value: '0px', usage: 'Default for everything: buttons, tiles, fields, code.' },
  { name: 'radius-icon', value: '22%', usage: 'App icon and favicon tile only.' },
  { name: 'radius-full', value: '9999px', usage: 'Avatar circle and status dot only.' },
] };

// ---------------------------------------------------------------- project/tokens.json
const colorTokens = order.map((name) => {
  const t = { name, value: { dark: all.dark[name], light: all.light[name] }, usage: noteFor(name) };
  const fail = failing.filter((f) => f.fg === name);
  if (fail.length) t.usage += ' Contrast below target: ' + fail.map((f) => `${f.ground} ${f.theme === 'dark' ? 'G100' : 'White'} ${f.ratio}:1`).join(', ') + ' (Carbon value, unchanged).';
  return t;
});
const tokensJson = {
  name: brand.name,
  version: 1,
  color: { themes: [{ id: 'dark', name: 'G100 · Dark' }, { id: 'light', name: 'White · Paper' }], tokens: colorTokens },
  type: typeTokens,
  spacing,
  size,
  radius,
  meta: { source: 'Carbon Design System v11 (@carbon/themes ' + require('@carbon/themes/package.json').version + ', @carbon/type, @carbon/layout) with the pklnx customization from github.com/pklnx/design-system, theme/brand.json. Generated by scripts/build.mjs.' },
};
write(P('project/tokens.json'), JSON.stringify(tokensJson, null, 1) + '\n');

// ---------------------------------------------------------------- project/tokens.css (as the page compiles it)
const decl = (obj) => Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');
const darkVals = Object.fromEntries(order.map((n) => [n, all.dark[n]]));
const lightVals = Object.fromEntries(order.map((n) => [n, all.light[n]]));
const flat = (fam) => Object.fromEntries(fam.tokens.map((t) => [t.name, t.value]));
const rem = (v) => v;
let tcss = `/* ${brand.name} — generated from tokens.json */\n`;
tcss += `:root, [data-theme="dark"] {\n${decl(darkVals)}\n}\n[data-theme="light"] {\n${decl(lightVals)}\n}\n`;
tcss += `:root {\n${decl({ ...flat(spacing), ...flat(size), ...flat(radius), 'font-sans': typeTokens.families.sans, 'font-mono': typeTokens.families.mono })}\n}\n`;
for (const g of typeTokens.groups) for (const s of g.styles) {
  const fam = s.family || g.family;
  tcss += `.${s.name} { font-family: var(--font-${fam}); font-size: ${rem(s.fontSize)}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''} }\n`;
}
for (const f of typeTokens.fonts) tcss += `@font-face { font-family: "${f.family}"; src: url("${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style || 'normal'}; font-display: swap; }\n`;
write(P('project/tokens.css'), tcss);

// ---------------------------------------------------------------- theme/ for code
// The tokens that differ from stock Carbon in either theme, to load after @carbon/styles.
// Both blocks set the same keys, each with its own theme's value (Carbon's where only the
// other theme changes it): the light selector includes :root, which also matches
// <html class="cds--g100">, so a key set only in the light block would leak into dark mode.
const overrideKeys = [...new Set([...Object.keys(changed.light), ...Object.keys(changed.dark)])].filter((k) => k !== 'star');
for (const id of ['light', 'dark']) for (const k of overrideKeys) if (!(k in all[id])) throw new Error(`token ${k} missing in ${id}`);
const overrides = (id) => Object.fromEntries(overrideKeys.map((k) => [k, all[id][k]]));
const overrideBlock = (id) => [...Object.entries(overrides(id)).map(([k, v]) => `  --cds-${k}: ${v};`), `  --pklnx-star: ${all[id].star};`].join('\n');
const themeCss = `/* pklnx Carbon theme: overrides on top of @carbon/styles. Load after Carbon's CSS.
   Generated by scripts/build.mjs from theme/brand.json. Do not edit. */
:root, .cds--white, [data-theme="light"] {\n${overrideBlock('light')}\n}
.cds--g100, [data-theme="dark"] {\n${overrideBlock('dark')}\n}
`;
write(P('theme/pklnx-carbon.css'), themeCss);
const scssMap = (id) => Object.entries(overrides(id)).map(([k, v]) => `  ${k}: ${v},`).join('\n');
write(P('theme/_index.scss'), `// pklnx Carbon theme for Sass. Generated by scripts/build.mjs. Do not edit.
//   @use '@carbon/styles/scss/themes';
//   @use '@pklnx/design-system/theme' as pklnx;
//   @use '@carbon/styles/scss/theme' with ($theme: pklnx.$g100);
// Component tokens (button, notification) do not follow a custom theme map in Sass:
// include pklnx.overrides-light / pklnx.overrides-dark on the element that carries the theme.
@use 'sass:map';
@use '@carbon/styles/scss/themes';

$overrides-white: (\n${scssMap('light')}\n);
$overrides-g100: (\n${scssMap('dark')}\n);

$star-white: ${brand.logo.light.star};
$star-g100: ${brand.logo.dark.star};

$white: map.merge(themes.$white, $overrides-white);
$g100: map.merge(themes.$g100, $overrides-g100);

@mixin overrides-light { @each $k, $v in $overrides-white { --cds-#{$k}: #{$v}; } --pklnx-star: #{$star-white}; }
@mixin overrides-dark { @each $k, $v in $overrides-g100 { --cds-#{$k}: #{$v}; } --pklnx-star: #{$star-g100}; }
`);
write(P('theme/tokens.json'), JSON.stringify({ light: all.light, dark: all.dark, changed }, null, 1) + '\n');

// ---------------------------------------------------------------- project/components/bundle.css
const carbonCss = sass.compile(P('src/carbon.scss'), { loadPaths: [P('node_modules')], style: 'compressed', silenceDeprecations: ['if-function', 'mixed-decls', 'global-builtin', 'import'], quietDeps: true }).css;
const bridge = order.map((n) => `--cds-${n}:var(--${n})`).join(';');
const rest = (id) => Object.entries(all[id]).filter(([n]) => !listed(n)).map(([n, v]) => `--cds-${n}:${v}`).join(';');
const pkCss = fs.readFileSync(P('src/pklnx.css'), 'utf8');
let bundleCss = `/* ${brand.name}: Carbon components with the pklnx theme. Colors come from tokens.css through the bridge below.
   Generated by scripts/build.mjs, do not edit. Carbon (c) IBM Corp., Apache-2.0. */
:root,[data-theme]{${bridge};--cds-font-family:var(--font-sans)}
:root,[data-theme="dark"]{color-scheme:dark;--cds-color-scheme:dark;${rest('dark')}}
[data-theme="light"]{color-scheme:light;--cds-color-scheme:light;${rest('light')}}
${carbonCss}
${pkCss}`;
if (/<\/style/i.test(bundleCss)) throw new Error('bundle.css contains </style');
write(P('project/components/bundle.css'), bundleCss);

// ---------------------------------------------------------------- project/components/bundle.js
const geo = JSON.parse(fs.readFileSync(P('theme/logo-geometry.json'), 'utf8'));
const globals = {
  name: 'globals',
  setup(b) {
    b.onResolve({ filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime)$/ }, (a) => ({ path: a.path, namespace: 'g' }));
    b.onLoad({ filter: /.*/, namespace: 'g' }, (a) => {
      if (a.path === 'react') return { contents: 'module.exports = window.React', loader: 'js' };
      if (a.path.startsWith('react-dom')) return { contents: 'module.exports = window.ReactDOM', loader: 'js' };
      return { contents: 'var R = window.React; function j(t, p, k) { var q = Object.assign({}, p); if (k !== undefined) q.key = k; return R.createElement(t, q); } module.exports = { jsx: j, jsxs: j, Fragment: R.Fragment };', loader: 'js' };
    });
  },
};
const built = await esbuild.build({
  entryPoints: [P('src/components.jsx')], bundle: true, format: 'iife', write: false, minify: true, target: 'es2019', metafile: true,
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __PKLNX_LOGO__: JSON.stringify(geo) }, plugins: [globals], legalComments: 'none',
});
let js = built.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '\\x3C!--');
const comps = ['Logo', 'Icon', 'Button', 'Prompt', 'StatusBadge', 'ServiceCard', 'CodeBlock', 'TextField', 'SiteHeader'];
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: 'Pklnx', components: comps.map((name) => ({ name })) })} */\n/* ${brand.name}. Carbon React (c) IBM Corp., Apache-2.0. Generated by scripts/build.mjs. */\n`;
write(P('project/components/bundle.js'), header + js);


// ---------------------------------------------------------------- third-party notices
// Every package that ends up in bundle.js, bundle.css, tokens or icon files, with its license text.
const shipped = new Set(['@carbon/styles', '@carbon/themes', '@carbon/colors', '@carbon/type', '@carbon/layout', '@carbon/icons-react']);
for (const f of Object.keys(built.metafile.inputs)) {
  const m = /node_modules\/((@[^/]+\/)?[^/]+)/.exec(f);
  if (m && !/^react(-dom)?$/.test(m[1])) shipped.add(m[1]);
}
const licenseText = (dir) => {
  const f = fs.readdirSync(dir).find((n) => /^(licen[cs]e|copying)(\.md|\.txt)?$/i.test(n));
  return f ? fs.readFileSync(path.join(dir, f), 'utf8').trim() : null;
};
let notices = `# Third-party notices\n\nThe pklnx design system ships code, styles, icons and fonts from the projects below.\nGenerated by scripts/build.mjs from the installed packages. Do not edit.\n\n`;
notices += `| Package | Version | License | Used in |\n| --- | --- | --- | --- |\n`;
const rows = [...shipped].sort().map((n) => { const j = require(P('node_modules', n, 'package.json')); return { n, v: j.version, l: j.license, dir: P('node_modules', n) }; });
const usedIn = (n) => n === '@carbon/styles' ? 'bundle.css' : /^@carbon\/(themes|colors|type|layout)$/.test(n) ? 'tokens, theme' + (n === '@carbon/layout' ? ', bundle.js' : '') : n === '@carbon/icons-react' ? 'bundle.js, assets/Icons' : 'bundle.js';
for (const r of rows) notices += `| ${r.n} | ${r.v} | ${r.l} | ${usedIn(r.n)} |\n`;
notices += `| IBM Plex Sans, IBM Plex Mono (@ibm/plex-sans, @ibm/plex-mono) | ${require(P('node_modules/@ibm/plex-sans/package.json')).version}, ${require(P('node_modules/@ibm/plex-mono/package.json')).version} | OFL-1.1 | project/fonts, logo outlines |\n\n`;
const noticeFiles = rows.map((r) => { const f = fs.readdirSync(r.dir).find((n) => /^notice(\.md|\.txt)?$/i.test(n)); return f ? { r, text: fs.readFileSync(path.join(r.dir, f), 'utf8').trim() } : null; }).filter(Boolean);
notices += `Carbon packages are used unmodified; the pklnx theme overrides Carbon tokens through CSS custom properties and does not change Carbon source files. NOTICE files of the packages are reproduced below${noticeFiles.length ? '' : ' (none present)'}.\n\n`;
for (const { r, text } of noticeFiles) notices += `## NOTICE: ${r.n} ${r.v}\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
const seen = new Map();
for (const r of rows) {
  const t = licenseText(r.dir) || `${r.l} (no license file in the package)`;
  const key = t.replace(/\s+/g, ' ');
  if (!seen.has(key)) seen.set(key, { text: t, pkgs: [] });
  seen.get(key).pkgs.push(`${r.n} ${r.v}`);
}
for (const { text, pkgs } of seen.values()) notices += `## ${pkgs.join(', ')}\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
const ofl = fs.readFileSync(P('node_modules/@ibm/plex-sans/fonts/complete/woff2/license.txt'), 'utf8').trim();
notices += `## IBM Plex Sans, IBM Plex Mono\n\n\`\`\`\n${ofl}\n\`\`\`\n`;
write(P('THIRD_PARTY_NOTICES.md'), notices);
write(P('project/THIRD_PARTY_NOTICES.txt'), notices);
write(P('project/fonts/OFL.txt'), ofl + '\n');
console.log('notices', rows.length, 'packages,', seen.size, 'license texts');

console.log('colors listed', order.length, 'changed', Object.keys(changed.light).length, '/', Object.keys(changed.dark).length);
console.log('contrast failing', failing.map((f) => `${f.theme} ${f.fg}/${f.ground} ${f.ratio}`).join('; ') || 'none');
console.log('bundle.css', bundleCss.length, 'bundle.js', (header + js).length);
