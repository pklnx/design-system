// Builds the documentation site for GitHub Pages from project/ into site/.
// Same content as the claude.ai design system: brand book, tokens, live component previews, assets.
// Run after `npm run build`: node scripts/build_site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { marked } from 'marked';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const P = (...p) => path.join(ROOT, ...p);
const OUT = P('site');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = (s) => marked.parse(s, { gfm: true });

fs.rmSync(OUT, { recursive: true, force: true });
const tokens = JSON.parse(fs.readFileSync(P('project/tokens.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(P('project/design-system.json'), 'utf8'));
const geo = JSON.parse(fs.readFileSync(P('theme/logo-geometry.json'), 'utf8'));
const title = index.title;

// ---------------------------------------------------------------- static files
for (const f of ['tokens.css', 'components/bundle.css', 'components/bundle.js', 'THIRD_PARTY_NOTICES.txt']) copy(P('project', f), path.join(OUT, f));
for (const f of fs.readdirSync(P('project/fonts'))) copy(P('project/fonts', f), path.join(OUT, 'fonts', f));
copy(P('node_modules/react/umd/react.production.min.js'), path.join(OUT, 'lib/react.production.min.js'));
copy(P('node_modules/react-dom/umd/react-dom.production.min.js'), path.join(OUT, 'lib/react-dom.production.min.js'));
copy(P('theme/pklnx-carbon.css'), path.join(OUT, 'theme/pklnx-carbon.css'));
const blobToPath = {};
for (const g of index.groups) {
  for (const [name, rec] of Object.entries(index.assetGroups[g].files)) {
    copy(P('project/assets', g, name), path.join(OUT, 'assets', g, name));
    blobToPath[rec.blob] = `assets/${g}/${name}`;
  }
}
copy(P('project/assets/Logos/pklnx-favicon.svg'), path.join(OUT, 'favicon.svg'));

// ---------------------------------------------------------------- components and previews
const compDirs = fs.readdirSync(P('project/components')).filter((d) => fs.existsSync(P('project/components', d, 'preview.html')));
const comps = compDirs.filter((d) => d !== 'Cover').map((name) => {
  const src = fs.readFileSync(P('project/components', name, 'preview.html'), 'utf8');
  const marker = /@dsCard([^>]*)-->/.exec(src)?.[1] || '';
  const readme = fs.existsSync(P('project/components', name, 'README.md')) ? fs.readFileSync(P('project/components', name, 'README.md'), 'utf8') : `# ${name}\n`;
  return {
    name, src, readme,
    group: /group="([^"]*)"/.exec(marker)?.[1] || 'Other',
    subtitle: /subtitle="([^"]*)"/.exec(marker)?.[1] || '',
    height: +(/height=(\d+)/.exec(marker)?.[1] || 200),
    width: +(/width=(\d+)/.exec(marker)?.[1] || 0),
  };
});
const groupOrder = ['Brand', 'Foundations', 'Actions', 'Content', 'Forms', 'Navigation', 'Stationery', 'Social'];
comps.sort((a, b) => (groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group)) || a.name.localeCompare(b.name));

// A preview runs as on claude.ai: tokens.css, bundle.css, React, bundle.js preloaded, data-theme on <html>.
// Inside the site it follows the theme of the page around it.
const previewHead = (depth) => {
  const up = '../'.repeat(depth);
  return `<link rel="stylesheet" href="${up}tokens.css"><link rel="stylesheet" href="${up}components/bundle.css">` +
    `<script src="${up}lib/react.production.min.js"></script><script src="${up}lib/react-dom.production.min.js"></script><script src="${up}components/bundle.js"></script>` +
    `<script>(function(){var d=document.documentElement;function t(){try{var p=window.parent&&window.parent.document.documentElement.getAttribute('data-theme');if(p)d.setAttribute('data-theme',p);}catch(e){}}` +
    `d.setAttribute('data-theme',(new URLSearchParams(location.search)).get('theme')||'dark');t();try{new MutationObserver(t).observe(window.parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']});}catch(e){}})();</script>`;
};
const wrapPreview = (src) => {
  let html = src.replace(/^<!--\s*@dsCard[^>]*-->\s*/, '');
  html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => (blobToPath[id] ? `../${blobToPath[id]}` : m));
  return html.replace(/<head>/i, `<head>${previewHead(1)}`);
};
for (const c of comps) write(path.join(OUT, 'preview', `${c.name}.html`), wrapPreview(c.src));
write(path.join(OUT, 'preview', 'Cover.html'), wrapPreview(fs.readFileSync(P('project/components/Cover/preview.html'), 'utf8')));

// ---------------------------------------------------------------- page shell
const logoSvg = (h) => {
  const w = geo.word, vb = w.viewBox.split(' ').map(Number);
  return `<svg viewBox="${w.viewBox}" height="${h}" width="${Math.round(h * vb[2] / vb[3])}" role="img" aria-label="pklnx.space"><path fill="currentColor" d="${w.text}"/><path style="fill:var(--star)" d="${w.star}"/><path fill="currentColor" d="${w.bracket}"/></svg>`;
};
const nav = [
  ['Overview', 'index.html'],
  ['Colors', 'colors.html'],
  ['Typography', 'typography.html'],
  ['Spacing and size', 'spacing.html'],
  ['Assets', 'assets.html'],
];
const SITE_CSS = `
html,body{margin:0;background:var(--background);color:var(--text-primary);font-family:var(--font-sans)}
.site-header{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:16px;height:48px;padding:0 16px;background:var(--background);border-bottom:1px solid var(--border-subtle-00)}
.site-header a.brand{display:flex;align-items:center;gap:12px;color:var(--text-primary);text-decoration:none}
.site-header .sys{font-size:.875rem;letter-spacing:.16px;color:var(--text-secondary)}
.site-header .spacer{flex:1}
.theme-btn{height:48px;padding:0 16px;border:0;background:transparent;color:var(--text-primary);font:inherit;font-size:.875rem;cursor:pointer}
.theme-btn:hover{background:var(--background-hover)}
.theme-btn:focus-visible,.side a:focus-visible,.site-header a:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}
.layout{display:grid;grid-template-columns:256px minmax(0,1fr);min-height:calc(100vh - 49px)}
.side{border-right:1px solid var(--border-subtle-00);background:var(--layer-01);padding:16px 0;position:sticky;top:49px;height:calc(100vh - 49px);overflow:auto;box-sizing:border-box}
.side h3{margin:24px 16px 8px;font-size:.75rem;line-height:1.33;letter-spacing:.32px;font-weight:400;color:var(--text-secondary)}
.side a{display:block;padding:7px 16px;font-size:.875rem;line-height:1.29;letter-spacing:.16px;color:var(--text-secondary);text-decoration:none;border-left:3px solid transparent}
.side a:hover{background:var(--layer-hover-01);color:var(--text-primary)}
.side a[aria-current="page"]{color:var(--text-primary);font-weight:600;border-left-color:var(--border-interactive);background:var(--layer-selected-01)}
main{padding:32px;max-width:1056px;box-sizing:border-box}
.prose{max-width:720px;font-size:1rem;line-height:1.5;letter-spacing:0}
.prose h1{font-size:2.625rem;line-height:1.2;font-weight:300;margin:0 0 24px}
.prose h2{font-size:1.75rem;line-height:1.29;font-weight:400;margin:48px 0 16px}
.prose h3{font-size:1.25rem;line-height:1.4;font-weight:400;margin:32px 0 8px}
.prose p,.prose li{color:var(--text-primary)}
.prose p,.prose ul,.prose ol,.prose table,.prose pre{margin:0 0 16px}
.prose ul{list-style:disc;padding-left:24px}
.prose ol{list-style:decimal;padding-left:24px}
.prose li{margin:4px 0}
.prose strong{font-weight:600}
.prose a{color:var(--link-primary)}
.prose code{font-family:var(--font-mono);font-size:.875em;background:var(--layer-01);padding:0 4px}
.prose pre{background:var(--layer-01);padding:16px;overflow:auto}
.prose pre code{background:none;padding:0}
.prose table{border-collapse:collapse;width:100%;font-size:.875rem}
.prose th,.prose td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border-subtle-00);vertical-align:top}
.prose th{background:var(--layer-01);font-weight:600}
.page-title{font-size:2.625rem;line-height:1.2;font-weight:300;margin:0 0 8px}
.lead{font-size:1rem;line-height:1.5;color:var(--text-secondary);margin:0 0 32px;max-width:720px}
.frame{display:block;width:100%;border:1px solid var(--border-subtle-00);background:var(--background)}
.cover{max-width:960px;margin:0 0 32px}
.sw-table{width:100%;border-collapse:collapse;font-size:.875rem}
.sw-table th,.sw-table td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--border-subtle-00);vertical-align:top}
.sw-table th{background:var(--layer-01);font-weight:600}
.sw{display:inline-block;width:40px;height:24px;border:1px solid var(--border-subtle-01);vertical-align:middle}
.mono{font-family:var(--font-mono);font-size:.75rem}
.muted{color:var(--text-secondary)}
.group-title{font-size:1.25rem;line-height:1.4;font-weight:400;margin:40px 0 12px}
.type-row{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;padding:16px 0;border-bottom:1px solid var(--border-subtle-00)}
.bar{background:var(--background-brand);height:16px}
.asset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:2px}
.asset{background:var(--layer-01);padding:16px;display:flex;flex-direction:column;gap:12px}
.asset .img{display:flex;align-items:center;justify-content:center;height:120px;background:repeating-conic-gradient(var(--layer-02) 0 25%,var(--layer-01) 0 50%) 0 0/16px 16px}
.asset img{max-width:100%;max-height:104px}
.asset a{color:var(--link-primary);font-size:.875rem}
footer{margin-top:64px;padding-top:16px;border-top:1px solid var(--border-subtle-00);font-size:.75rem;color:var(--text-secondary)}
footer a{color:var(--link-primary)}
@media (max-width:800px){.layout{grid-template-columns:1fr}.side{position:static;height:auto;border-right:0;border-bottom:1px solid var(--border-subtle-00)}main{padding:24px 16px}.cover{margin:-24px -16px 24px}.type-row{grid-template-columns:1fr}}
`;
write(path.join(OUT, 'site.css'), SITE_CSS);

const page = ({ file, heading, body, depth = 0 }) => {
  const up = '../'.repeat(depth);
  const link = (label, href) => `<a href="${up}${href}"${href === file ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  let side = nav.map(([l, h]) => link(l, h)).join('');
  let last = '';
  for (const c of comps) {
    if (c.group !== last) { side += `<h3>${esc(c.group)}</h3>`; last = c.group; }
    side += link(c.name, `components/${c.name}.html`);
  }
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(heading)} · ${esc(title)}</title>
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${up}tokens.css"><link rel="stylesheet" href="${up}components/bundle.css"><link rel="stylesheet" href="${up}site.css">
<script>try{var t=localStorage.getItem('pklnx-ds-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
</head>
<body>
<header class="site-header">
  <a class="brand" href="${up}index.html">${logoSvg(20)}<span class="sys">design system</span></a>
  <span class="spacer"></span>
  <button class="theme-btn" type="button" id="theme-btn" aria-label="Switch theme">Theme: G100</button>
</header>
<div class="layout">
<nav class="side" aria-label="Design system">${side}</nav>
<main id="main">
${body}
<footer>${esc(title)} · <a href="https://github.com/pklnx/design-system">github.com/pklnx/design-system</a> · Code MIT, brand assets all rights reserved · <a href="${up}THIRD_PARTY_NOTICES.txt">Third-party notices</a> · Carbon and IBM are trademarks of IBM, this project is not affiliated with IBM.</footer>
</main>
</div>
<script>
(function(){var d=document.documentElement,b=document.getElementById('theme-btn');
function label(){b.textContent='Theme: '+(d.getAttribute('data-theme')==='light'?'White':'G100');}
label();b.addEventListener('click',function(){var n=d.getAttribute('data-theme')==='light'?'dark':'light';d.setAttribute('data-theme',n);try{localStorage.setItem('pklnx-ds-theme',n);}catch(e){}label();});
document.querySelectorAll('iframe[data-autosize]').forEach(function(f){function fit(){try{var h=f.contentDocument.documentElement.scrollHeight;if(h)f.style.height=h+'px';}catch(e){}}
f.addEventListener('load',function(){fit();setTimeout(fit,300);setTimeout(fit,1200);try{new ResizeObserver(fit).observe(f.contentDocument.body);}catch(e){}});});})();
</script>
</body></html>
`;
};

// ---------------------------------------------------------------- pages
const readme = fs.readFileSync(P('project/README.md'), 'utf8');
write(path.join(OUT, 'index.html'), page({
  file: 'index.html', heading: 'Overview',
  body: `<iframe class="frame cover" src="preview/Cover.html" title="Cover" style="height:288px" scrolling="no"></iframe>
<div class="prose">${md(readme)}</div>`,
}));

// Colors
const stems = {};
for (const t of tokens.color.tokens) {
  const stem = t.name.split('-')[0];
  (stems[stem] = stems[stem] || []).push(t);
}
let colors = `<h1 class="page-title">Colors</h1><p class="lead">Carbon color tokens for ${tokens.color.themes.map((t) => esc(t.name)).join(' and ')}. Use them as <span class="mono">var(--cds-&lt;name&gt;)</span> in code. Values in the swatches follow the theme switch.</p>`;
for (const [stem, list] of Object.entries(stems)) {
  colors += `<h2 class="group-title">${esc(stem)}</h2><table class="sw-table"><thead><tr><th style="width:56px"></th><th>Token</th><th>G100</th><th>White</th><th>Usage</th></tr></thead><tbody>`;
  for (const t of list) {
    colors += `<tr><td><span class="sw" style="background:var(--${t.name})"></span></td><td class="mono">${esc(t.name)}</td><td class="mono muted">${esc(t.value.dark)}</td><td class="mono muted">${esc(t.value.light)}</td><td>${md(t.usage).replace(/^<p>|<\/p>\s*$/g, '')}</td></tr>`;
  }
  colors += '</tbody></table>';
}
write(path.join(OUT, 'colors.html'), page({ file: 'colors.html', heading: 'Colors', body: colors }));

// Typography
let typo = `<h1 class="page-title">Typography</h1><p class="lead">IBM Plex Sans and IBM Plex Mono with Carbon's productive type scale. Each style is a class of the same name in tokens.css.</p>`;
for (const g of tokens.type.groups) {
  typo += `<h2 class="group-title">${esc(g.name)}</h2>`;
  for (const s of g.styles) {
    typo += `<div class="type-row"><div><div class="mono">${esc(s.name)}</div><div class="muted mono">${esc(s.fontSize)} / ${esc(s.lineHeight)} / ${esc(s.fontWeight)}</div><div class="muted" style="font-size:.75rem;margin-top:8px">${esc(s.usage || '')}</div></div><div class="${esc(s.name)}" lang="de">${esc(s.sample || s.name)}</div></div>`;
  }
}
write(path.join(OUT, 'typography.html'), page({ file: 'typography.html', heading: 'Typography', body: typo }));

// Spacing, size, radius
let sp = `<h1 class="page-title">Spacing and size</h1><p class="lead">Carbon spacing scale, control heights and the three radius exceptions.</p>`;
for (const [key, label] of [['spacing', 'Spacing'], ['size', 'Size'], ['radius', 'Radius']]) {
  const fam = tokens[key];
  sp += `<h2 class="group-title">${label}</h2>${fam.note ? `<p class="muted">${esc(fam.note)}</p>` : ''}<table class="sw-table"><thead><tr><th>Token</th><th>Value</th><th style="width:40%"></th><th>Usage</th></tr></thead><tbody>`;
  for (const t of fam.tokens) {
    const vis = key === 'radius'
      ? `<span style="display:inline-block;width:48px;height:48px;background:var(--background-brand);border-radius:${t.value === '9999px' ? '50%' : t.value}"></span>`
      : `<div class="bar" style="width:var(--${t.name});${key === 'size' ? 'height:var(--' + t.name + ');max-width:100%' : ''}"></div>`;
    sp += `<tr><td class="mono">${esc(t.name)}</td><td class="mono muted">${esc(t.value)}</td><td>${vis}</td><td>${esc(t.usage || '')}</td></tr>`;
  }
  sp += '</tbody></table>';
}
write(path.join(OUT, 'spacing.html'), page({ file: 'spacing.html', heading: 'Spacing and size', body: sp }));

// Assets
let as = `<h1 class="page-title">Assets</h1><p class="lead">Logos, icons, patterns and social images as SVG. Brand assets are all rights reserved, Carbon icons are Apache-2.0.</p>`;
for (const g of index.groups) {
  const notes = fs.existsSync(P('project/assets', g, 'README.md')) ? fs.readFileSync(P('project/assets', g, 'README.md'), 'utf8').replace(/^# .*\n/, '') : '';
  as += `<h2 class="group-title">${esc(g)}</h2><div class="prose">${md(notes)}</div><div class="asset-grid">`;
  for (const name of index.assetGroups[g].order) {
    as += `<div class="asset"><div class="img"><img src="assets/${esc(g)}/${esc(name)}" alt="${esc(name)}" loading="lazy"></div><a href="assets/${esc(g)}/${esc(name)}" download>${esc(name)}</a></div>`;
  }
  as += '</div>';
}
write(path.join(OUT, 'assets.html'), page({ file: 'assets.html', heading: 'Assets', body: as }));

// Components
for (const c of comps) {
  const body = `<h1 class="page-title">${esc(c.name)}</h1><p class="lead">${esc(c.subtitle)}</p>
<iframe class="frame" data-autosize src="../preview/${c.name}.html" title="${esc(c.name)} preview" style="height:${c.height}px"></iframe>
<div class="prose" style="margin-top:32px">${md(c.readme.replace(/^# .*\n/, ''))}</div>`;
  write(path.join(OUT, 'components', `${c.name}.html`), page({ file: `components/${c.name}.html`, heading: c.name, body, depth: 1 }));
}
write(path.join(OUT, '.nojekyll'), '');
console.log('site', comps.length, 'components,', Object.keys(blobToPath).length, 'assets →', path.relative(ROOT, OUT));
