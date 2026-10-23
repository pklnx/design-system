// Checks theme/vitepress.css against theme/tokens.json, scripts/vitepress-map.mjs and the
// VitePress fixture (scripts/fixtures/vitepress-<version>.json, captured from the npm
// tarball by scripts/capture-vitepress-fixture.mjs; no network here).
//
//   - structure: two custom-property blocks (:root, .dark) with the same variables,
//     @font-face, flat selector rules; no nested at-rules
//   - colours: each value is its mapped token; a few literals pinned
//   - contrast: every pair VitePress renders with the mapped variables
//   - overrides: every VitePress rule that sets a corner, an outline or a font is
//     overridden (and the override wins) or kept with a reason (and still wins where it
//     is a focus rule)
//   - fonts: every url() resolves to a file in the package
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { EXPECTED_FILES } from './check-pack.mjs';
import {
  compareSpecificity, elementOf, formatSpecificity, matchesCompound, parseCss, selectorMatches, specificity, splitTopLevel, subjectCompound,
} from './css-selectors.mjs';
import {
  BLOCK_ICONS, CORNERS, CUSTOM_BLOCK_ELEMENTS, FONT_FACES, KEPT, MAP, PAIRS, RINGS, RING_GROUNDS, RULES, STRIPES, VITEPRESS_VERSION, isTargetValue, staticProperties,
} from './vitepress-map.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const CSS_PATH = 'theme/vitepress.css';
const tokens = JSON.parse(read('theme/tokens.json'));
const families = JSON.parse(read('project/tokens.json')).type.families;
const fixture = JSON.parse(read(`scripts/fixtures/vitepress-${VITEPRESS_VERSION}.json`));
const parsed = parseCss(read(CSS_PATH));

const norm = (s) => splitTopLevel(s, ',').map((x) => x.replace(/\s+/g, ' ').trim()).join(', ');
const declText = (d) => `${d.prop}: ${d.value}${d.important ? ' !important' : ''}`;
const isCustom = (d) => d.prop.startsWith('--');
// '#0043ce', 0.4 → 'rgba(0, 67, 206, 0.4)' (written here again, not imported from the map).
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;

// The rules of vitepress.css that set custom properties, selected by selector.
function variableBlock(selector) {
  const blocks = parsed.rules.filter((r) => r.selector === selector && r.decls.some(isCustom));
  assert.equal(blocks.length, 1, `exactly one ${selector} block with custom properties`);
  const props = new Map();
  for (const d of blocks[0].decls) {
    assert.ok(isCustom(d), `${selector} sets ${d.prop}, which is not a custom property`);
    assert.ok(!props.has(d.prop), `${d.prop} set twice in ${selector}`);
    props.set(d.prop, d.value);
  }
  return props;
}
const blocks = () => ({ light: variableBlock(':root'), dark: variableBlock('.dark') });

// Every selector alternative of every selector rule in vitepress.css, with its declarations.
// `order` is the source order of the rule.
const pklnxAlternatives = parsed.rules.filter((r) => !r.decls.some(isCustom)).flatMap((r, order) => splitTopLevel(r.selector, ',').map((alt) => ({
  rule: r, selector: alt, spec: specificity(alt), decls: r.decls, order,
})));
// The pklnx declaration of `prop` that applies to `el` among all of vitepress.css:
// !important first, then specificity, then the later rule.
function pklnxWinner(prop, el) {
  const candidates = pklnxAlternatives.filter((a) => selectorMatches(a.selector, el))
    .flatMap((a) => a.decls.filter((d) => d.prop === prop).map((d) => ({ alt: a, decl: d })));
  candidates.sort((x, y) => (Number(y.decl.important) - Number(x.decl.important)) || compareSpecificity(y.alt.spec, x.alt.spec) || (y.alt.order - x.alt.order));
  return candidates[0] ?? null;
}
const findRule = (selectors) => {
  const want = norm(selectors.join(', '));
  const found = parsed.rules.filter((r) => norm(r.selector) === want);
  assert.equal(found.length, 1, `vitepress.css has one rule for ${want}`);
  return found[0];
};

const key = (file, selector, property) => `${file}|${selector}|${property}`;
const fixtureRules = (file, selector) => fixture.rules.filter((r) => r.file === file && r.selector === selector);
const CLASSIFIED = ['border-radius', 'outline', 'font-family'];
const withStates = (el) => ({ states: ['focus', 'focus-visible', 'hover'], ...el });
// Border properties (not the radius) count where they reach a custom block.
const isBorder = (prop) => prop.startsWith('border') && prop !== 'border-radius';
const BLOCK_ELEMENTS = CUSTOM_BLOCK_ELEMENTS.map(withStates);
const needsClassification = (r) => (CLASSIFIED.includes(r.property) && !isTargetValue(r.property, r.value))
  || (isBorder(r.property) && BLOCK_ELEMENTS.some((el) => selectorMatches(r.selector, el)));
// A pklnx property overrides the same property and, for border-left, the left side of
// the border shorthands (border-inline-start is the left side in the products' LTR docs).
const LEFT_SIDE = ['border', 'border-color', 'border-width', 'border-style', 'border-left', 'border-left-color', 'border-left-width', 'border-left-style',
  'border-inline', 'border-inline-color', 'border-inline-width', 'border-inline-style', 'border-inline-start', 'border-inline-start-color', 'border-inline-start-width', 'border-inline-start-style'];
const overridesProp = (ours, theirs) => ours === theirs || (ours === 'border-left' && LEFT_SIDE.includes(theirs));
const alternatives = (selector) => splitTopLevel(selector, ',');
const listMatches = (selector, el) => alternatives(selector).some((a) => selectorMatches(a, el));
// The alternative of a selector list that applies to `el`: the most specific one that matches.
function applyingAlternative(selector, el) {
  const matching = alternatives(selector).filter((a) => selectorMatches(a, el));
  return matching.sort((a, b) => compareSpecificity(specificity(b), specificity(a)))[0] ?? null;
}

// Whether pklnx alternative `alt` targets the element of VitePress rule `r`: its subject
// compound has every class of r's subject compound and matches every element r's
// subject matches (same type, attributes and pseudo-element).
function covers(alt, r) {
  const theirs = subjectCompound(r.selector);
  const ours = subjectCompound(alt);
  return theirs.classes.every((c) => ours.classes.includes(c)) && matchesCompound(ours, elementOf(theirs));
}

// Whether pklnx declaration `d` on alternative `alt` beats VitePress rule `r`.
function beats(alt, d, r) {
  if (r.layer) return !r.important; // unlayered beats layered normal declarations
  if (r.important) return d.important && compareSpecificity(specificity(alt), r.specificity) > 0;
  return d.important || compareSpecificity(specificity(alt), r.specificity) > 0;
}

const KEPT_KEYS = new Set(KEPT.map((k) => key(k.file, k.selector, k.property)));
const KEPT_WITH_ELEMENT = new Set(KEPT.filter((k) => k.element).map((k) => key(k.file, k.selector, k.property)));
const declProps = (decls) => decls.map((d) => d.slice(0, d.indexOf(':')).trim());
const coverEntries = [
  ...CORNERS.map((c) => ({ ...c, properties: ['border-radius'] })),
  ...RULES.filter((r) => r.covers).map((r) => ({ ...r, selectors: splitTopLevel(r.selector, ','), properties: declProps(r.decls) })),
];
// The fixture rules an entry overrides: those of its covered selectors that set a
// property the entry sets.
const coveredRules = (e) => e.covers.flatMap((c) => fixtureRules(c.file, c.selector).filter((r) => e.properties.some((p) => overridesProp(p, r.property)) && needsClassification(r)));
const COVERED_KEYS = new Set(coverEntries.flatMap((e) => coveredRules(e).map((r) => key(r.file, r.selector, r.property))));

// ---------------------------------------------------------------- structure

test('vitepress.css is flat: only @font-face at-rules, at the top level', () => {
  for (const a of parsed.atRules) {
    assert.equal(a.name, 'font-face', `unexpected @${a.name} at line ${a.line}`);
    assert.equal(a.depth, 0);
  }
  for (const r of parsed.rules) {
    assert.deepEqual(r.parents, [], `nested rule ${r.selector}`);
    assert.equal(r.media ?? r.layer ?? r.supports, null, `${r.selector} sits in an at-rule`);
  }
});

test('vitepress.css: exactly the :root and .dark blocks set custom properties, the same set', () => {
  const { light, dark } = blocks();
  const setters = parsed.rules.filter((r) => r.decls.some(isCustom)).map((r) => r.selector);
  assert.deepEqual(setters, [':root', '.dark']);
  assert.deepEqual([...dark.keys()].sort(), [...light.keys()].sort());
  const icons = Object.keys(BLOCK_ICONS).map((kind) => `--pklnx-vp-icon-${kind}`);
  assert.deepEqual([...light.keys()].sort(), [...Object.keys(MAP), ...Object.keys(staticProperties(families)), ...icons].sort());
});

test('vitepress.css: every colour equals tokens.json for its mapped token', () => {
  const b = blocks();
  for (const theme of ['light', 'dark']) {
    for (const [name, t] of Object.entries(MAP)) {
      let want = t[theme] === 'transparent' ? 'transparent' : tokens[theme][t[theme]];
      assert.ok(want, `${theme}: token ${t[theme]} missing in tokens.json`);
      if (t.alpha !== undefined) want = rgba(want, t.alpha);
      assert.equal(b[theme].get(name), want, `${theme} ${name} (${t[theme]})`);
    }
  }
});

test('vitepress.css: pinned values', () => {
  const { light, dark } = blocks();
  assert.equal(light.get('--vp-c-brand-1'), '#8a3ffc');
  assert.equal(dark.get('--vp-c-brand-1'), '#be95ff');
  assert.equal(dark.get('--vp-button-brand-bg'), '#8a3ffc');
  assert.equal(light.get('--vp-c-bg'), '#ffffff');
  assert.equal(dark.get('--vp-c-bg'), '#161616');
  assert.equal(light.get('--vp-local-search-highlight-text'), '#161616');
  assert.equal(dark.get('--vp-local-search-highlight-text'), '#f4f4f4');
  for (const b of [light, dark]) {
    assert.match(b.get('--vp-font-family-base'), /^"IBM Plex Sans", /);
    assert.match(b.get('--vp-font-family-mono'), /^"IBM Plex Mono", /);
    assert.equal(b.get('--vp-font-family-base'), families.sans);
    assert.equal(b.get('--vp-font-family-mono'), families.mono);
    assert.equal(b.get('--vp-home-hero-image-background-image'), 'none');
  }
});

test(`every --vp-* variable it sets exists in VitePress ${VITEPRESS_VERSION}`, () => {
  const known = new Set(Object.values(fixture.vars).flat());
  for (const name of blocks().light.keys()) {
    if (name.startsWith('--pklnx-')) continue;
    assert.ok(known.has(name), `${name} is not a VitePress variable`);
  }
});

// ---------------------------------------------------------------- contrast

function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(m, `not a 6-digit hex colour: ${hex}`);
  const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = luminance(a); const y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('contrast: every pair VitePress renders with the mapped variables, in both themes', () => {
  const b = blocks();
  const failing = [];
  let n = 0;
  for (const theme of ['light', 'dark']) {
    const v = (name) => { const x = b[theme].get(name); assert.ok(x, `${name} is not set in vitepress.css`); return x; };
    for (const p of PAIRS) for (const ground of p.on) {
      n++;
      const r = ratio(v(p.fg), v(ground));
      if (!(r >= p.min)) failing.push(`${theme} ${p.fg} on ${ground}: ${r.toFixed(2)} < ${p.min} (${p.where})`);
    }
  }
  assert.ok(n >= 200, `only ${n} pairs`);
  assert.deepEqual(failing, []);
});

test("contrast: Carbon's double focus ring reaches 3:1 on every button state", () => {
  const b = blocks();
  for (const theme of ['light', 'dark']) for (const g of RING_GROUNDS) {
    const best = Math.max(...RINGS.map((ring) => ratio(b[theme].get(ring), b[theme].get(g))));
    assert.ok(best >= 3, `${theme} ${g}: best ring ${best.toFixed(2)}`);
  }
});

// ---------------------------------------------------------------- fonts

test('fonts: every @font-face url() resolves to a font file in the package', () => {
  const faces = parsed.atRules.filter((a) => a.name === 'font-face');
  assert.equal(faces.length, FONT_FACES.length);
  for (const f of faces) {
    const src = f.decls.find((d) => d.prop === 'src').value;
    const urls = [...src.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    assert.equal(urls.length, 1, src);
    const file = path.posix.normalize(path.posix.join(path.posix.dirname(CSS_PATH), urls[0]));
    assert.ok(EXPECTED_FILES.includes(file), `${file} is not in the package (check-pack EXPECTED_FILES)`);
    assert.ok(existsSync(path.join(ROOT, file)), `${file} does not exist`);
    assert.ok(f.decls.some((d) => d.prop === 'font-display' && d.value === 'swap'));
  }
  const weights = (family) => faces.filter((f) => f.decls.find((d) => d.prop === 'font-family').value === `"${family}"`).map((f) => f.decls.find((d) => d.prop === 'font-weight').value);
  assert.deepEqual(weights('IBM Plex Sans'), ['300', '400', '400', '600 700']);
  assert.deepEqual(weights('IBM Plex Mono'), ['400', '600 700']);
});

// ---------------------------------------------------------------- overrides

test('every VitePress rule that sets a corner, an outline, a font or a custom-block border is overridden or kept', () => {
  const open = fixture.rules.filter(needsClassification).filter((r) => !COVERED_KEYS.has(key(r.file, r.selector, r.property)) && !KEPT_KEYS.has(key(r.file, r.selector, r.property)));
  assert.deepEqual(open.map((r) => `${r.file}:${r.line} ${r.selector} { ${r.property}: ${r.value} }`), []);
});

test('every overridden or kept entry names a VitePress rule of the fixture', () => {
  for (const e of coverEntries) for (const c of e.covers) {
    assert.ok(fixtureRules(c.file, c.selector).some((r) => e.properties.some((p) => overridesProp(p, r.property)) && needsClassification(r)), `${c.file} ${c.selector}: no ${e.properties.join('/')} rule to override`);
  }
  for (const k of KEPT) {
    assert.ok(k.reason, `${k.file} ${k.selector}: no reason`);
    assert.ok(CLASSIFIED.includes(k.property) || isBorder(k.property), `${k.file} ${k.selector}: property ${k.property}`);
    assert.ok(fixtureRules(k.file, k.selector).some((r) => r.property === k.property && needsClassification(r)), `${k.file} ${k.selector}: no ${k.property} rule to keep`);
    assert.ok(!COVERED_KEYS.has(key(k.file, k.selector, k.property)), `${k.file} ${k.selector} ${k.property} is both kept and overridden`);
  }
});

test('every corner override is border-radius: 0 !important', () => {
  for (const c of CORNERS) {
    const rule = findRule(c.selectors);
    assert.deepEqual(rule.decls.map(declText), ['border-radius: 0 !important'], c.selectors.join(', '));
  }
});

test('every overridden VitePress rule is targeted by the override and loses to it', () => {
  const failing = [];
  for (const e of coverEntries) {
    const rule = findRule(e.selectors);
    for (const r of coveredRules(e)) {
      const decl = rule.decls.find((d) => overridesProp(d.prop, r.property));
      assert.ok(decl, `${e.selectors.join(', ')} does not set ${r.property} (for ${r.file}:${r.line} ${r.selector})`);
      if (r.async && !decl.important && !r.layer) failing.push(`${r.file}:${r.line} ${r.selector} loads async, after vitepress.css: ${e.selectors.join(', ')} needs !important`);
      const winners = e.selectors.filter((alt) => covers(alt, r) && beats(alt, decl, r));
      if (!winners.length) failing.push(`${r.file}:${r.line} ${r.selector} ${formatSpecificity(r.specificity)}${r.important ? ' !important' : ''}${r.scoped ? ' scoped' : ''}: no selector of ${e.selectors.join(', ')} targets it and wins`);
    }
  }
  assert.deepEqual(failing, []);
});

test('focus, font and code rules match their elements, beat competing VitePress rules, and are not !important', () => {
  for (const e of RULES) {
    const rule = findRule([e.selector]);
    assert.deepEqual(rule.decls.map(declText), e.decls.map((d) => d.replace(/\s+/g, ' ')), e.selector);
    for (const d of rule.decls) assert.ok(!d.important, `${e.selector}: ${d.prop} is !important, so no VitePress rule could keep its own focus style`);
    for (const el of e.elements.map(withStates)) {
      const alt = applyingAlternative(e.selector, el);
      assert.ok(alt, `${e.selector} does not match its element ${JSON.stringify(el)}`);
      for (const d of rule.decls) {
        // Kept rules that carry an element must win instead (next test); other kept
        // rules (the custom-block frame) still have to lose where a pklnx rule applies.
        const competing = fixture.rules.filter((r) => overridesProp(d.prop, r.property) && !r.layer && !KEPT_WITH_ELEMENT.has(key(r.file, r.selector, r.property)) && selectorMatches(r.selector, el));
        for (const r of competing) {
          assert.ok(beats(alt, d, r), `${r.file}:${r.line} ${r.selector} ${formatSpecificity(r.specificity)} beats ${alt} ${formatSpecificity(specificity(alt))} on ${JSON.stringify(el)}`);
        }
      }
    }
  }
});

test('kept VitePress outline rules still win against every pklnx rule that matches their element', () => {
  const outlineSetters = pklnxAlternatives.filter((a) => a.decls.some((d) => d.prop === 'outline'));
  const failing = [];
  let checked = 0;
  for (const k of KEPT) {
    if (k.property !== 'outline') continue;
    for (const r of fixtureRules(k.file, k.selector).filter((x) => x.property === 'outline')) {
      if (r.layer) { assert.ok(!r.important, `${r.selector} is a layered !important outline`); continue; }
      assert.ok(k.element, `${k.file} ${k.selector}: a kept outline rule needs the element it styles`);
      const el = withStates(k.element);
      assert.ok(selectorMatches(r.selector, el), `${r.selector} does not match its element ${JSON.stringify(el)}`);
      for (const a of outlineSetters.filter((x) => selectorMatches(x.selector, el))) {
        const d = a.decls.find((x) => x.prop === 'outline');
        if (beats(a.selector, d, r) || compareSpecificity(r.specificity, a.spec) <= 0) {
          failing.push(`kept ${r.file}:${r.line} ${r.selector} ${formatSpecificity(r.specificity)} does not beat ${a.selector} ${formatSpecificity(a.spec)}`);
        }
      }
      checked++;
    }
  }
  assert.deepEqual(failing, []);
  assert.ok(checked >= 10, `only ${checked} kept outline rules checked`);
});

test('on each of its elements, every pklnx rule out-ranks the other pklnx rules that set the same property', () => {
  // E.g. on a link-styled VPButton (<a class="VPButton">) the button's double ring must
  // apply, not the text-link outline on top of it.
  const failing = [];
  for (const e of RULES) for (const el of e.elements.map(withStates)) for (const d of findRule([e.selector]).decls) {
    const w = pklnxWinner(d.prop, el);
    if (norm(w.alt.rule.selector) !== norm(e.selector)) failing.push(`${JSON.stringify(el)} ${d.prop}: ${w.alt.selector} ${formatSpecificity(w.alt.spec)} applies instead of ${e.selector}`);
  }
  assert.deepEqual(failing, []);
  const button = withStates({ tag: 'a', classes: ['VPButton', 'medium', 'brand'], attrs: { href: '/' } });
  assert.equal(pklnxWinner('outline', button).decl.value, 'none');
  assert.equal(pklnxWinner('outline', button).alt.selector, '.VPButton:focus-visible');
});

test('custom blocks: each kind has a 3 px left stripe in its support colour, details has none', () => {
  // Pinned here, not read from the map.
  const want = { info: 'support-info', note: 'support-info', important: 'support-info', tip: 'support-success', warning: 'support-warning', caution: 'support-warning', danger: 'support-error' };
  assert.deepEqual(Object.keys(STRIPES).sort(), Object.keys(want).sort());
  assert.equal(CUSTOM_BLOCK_ELEMENTS.filter((el) => el.classes.includes('github-alert')).length, 5, 'the five GitHub alert kinds');
  const b = blocks();
  for (const el of BLOCK_ELEMENTS) {
    const kind = el.classes[0];
    if (kind === 'details') {
      const setters = pklnxAlternatives.filter((a) => a.decls.some((d) => isBorder(d.prop)) && selectorMatches(a.selector, el));
      assert.deepEqual(setters.map((a) => a.selector), [], 'details gets no border');
      for (const theme of ['light', 'dark']) assert.equal(b[theme].get('--vp-custom-block-details-border'), 'transparent');
      continue;
    }
    const w = pklnxWinner('border-left', el);
    assert.ok(w, `no left border on ${JSON.stringify(el)}`);
    const m = /^3px solid var\((--[\w-]+)\)$/.exec(w.decl.value);
    assert.ok(m, `${w.alt.selector}: border-left ${w.decl.value}`);
    for (const theme of ['light', 'dark']) {
      assert.equal(b[theme].get(m[1]), tokens[theme][want[kind]], `${theme} ${kind} stripe (${JSON.stringify(el.classes)})`);
    }
  }
  assert.equal(b.light.get('--pklnx-vp-stripe-info'), '#0043ce');
  assert.equal(b.dark.get('--pklnx-vp-stripe-info'), '#4589ff');
});

test("custom blocks: Carbon's 1 px frame, the support colour at Carbon's opacity 0.4, details has none", () => {
  // @carbon/styles: the low-contrast ::before has `border-width: 1px 1px 1px 0`,
  // `border-color: $support-<kind>` and `filter: opacity(0.4)`.
  const want = { info: 'support-info', note: 'support-info', important: 'support-info', tip: 'support-success', warning: 'support-warning', caution: 'support-warning', danger: 'support-error' };
  const b = blocks();
  // VitePress gives every block `border: 1px solid transparent` and colours it per kind.
  const frame = fixtureRules('styles/components/custom-block.css', '.custom-block').find((r) => r.property === 'border');
  assert.equal(frame.value, '1px solid transparent');
  for (const kind of [...Object.keys(want), 'details']) {
    const colour = fixtureRules('styles/components/custom-block.css', `.custom-block.${kind}`).find((r) => r.property === 'border-color');
    const m = /^var\((--[\w-]+)\)$/.exec(colour.value);
    assert.ok(m, colour.value);
    for (const theme of ['light', 'dark']) {
      const expected = kind === 'details' ? 'transparent' : rgba(tokens[theme][want[kind]], 0.4);
      assert.equal(b[theme].get(m[1]), expected, `${theme} ${kind} frame`);
    }
  }
  assert.equal(b.light.get('--vp-custom-block-info-border'), 'rgba(0, 67, 206, 0.4)');
  assert.equal(b.dark.get('--vp-custom-block-danger-border'), 'rgba(250, 77, 86, 0.4)');
});

// The Carbon icons as @carbon/icons-react renders them, read here independently of the build.
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));
function carbonIcon(name) {
  const React = requireFromRoot('react');
  const { renderToStaticMarkup } = requireFromRoot('react-dom/server');
  const svg = renderToStaticMarkup(React.createElement(requireFromRoot('@carbon/icons-react')[name], { size: 20 }));
  const paths = [...svg.matchAll(/<path([^>]*)>/g)].map((m) => ({ d: /\bd="([^"]+)"/.exec(m[1])[1], inner: m[1].includes('inner-path') }));
  return { viewBox: /viewBox="([^"]+)"/.exec(svg)[1], outer: paths.find((p) => !p.inner).d, inner: paths.find((p) => p.inner).d };
}
// The data: SVG of a custom property: viewBox and paths (fill, d).
function dataSvg(value) {
  const m = /^url\("data:image\/svg\+xml,([^"]+)"\)$/.exec(value);
  assert.ok(m, `not a data: SVG url: ${value.slice(0, 60)}`);
  const svg = decodeURIComponent(m[1]);
  return { viewBox: /viewBox="([^"]+)"/.exec(svg)[1], paths: [...svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"\/>/g)].map((p) => ({ fill: p[1], d: p[2] })) };
}

test("custom blocks: each kind has Carbon's filled icon before its title, details has none", () => {
  // Pinned here: Carbon's InlineNotification icons per kind.
  const want = {
    info: ['InformationFilled', 'support-info'], note: ['InformationFilled', 'support-info'], important: ['InformationFilled', 'support-info'],
    tip: ['CheckmarkFilled', 'support-success'], warning: ['WarningFilled', 'support-warning'], caution: ['WarningFilled', 'support-warning'], danger: ['ErrorFilled', 'support-error'],
  };
  assert.deepEqual(Object.keys(BLOCK_ICONS).sort(), Object.keys(want).sort());
  const b = blocks();
  const before = (kind) => `.custom-block.${kind} > .custom-block-title::before`;
  const geometry = findRule(Object.keys(want).map(before));
  assert.deepEqual(geometry.decls.filter((d) => ['content', 'width', 'height'].includes(d.prop)).map(declText), ['content: ""', 'width: 1.25rem', 'height: 1.25rem']);
  for (const [kind, [name, support]] of Object.entries(want)) {
    const rule = findRule([before(kind)]);
    assert.deepEqual(rule.decls.map(declText), [`background-image: var(--pklnx-vp-icon-${kind})`]);
    const icon = carbonIcon(name);
    for (const theme of ['light', 'dark']) {
      const svg = dataSvg(b[theme].get(`--pklnx-vp-icon-${kind}`));
      assert.equal(svg.viewBox, icon.viewBox, `${theme} ${kind} viewBox`);
      // The outer path in the support colour; the inner path is a cut-out, except on
      // WarningFilled, where Carbon fills it #000000.
      const expected = [{ fill: tokens[theme][support], d: icon.outer }];
      if (name === 'WarningFilled') expected.push({ fill: '#000000', d: icon.inner });
      assert.deepEqual(svg.paths, expected, `${theme} ${kind} icon`);
    }
  }
  // No rule in vitepress.css names the details block, and no icon reaches it or its
  // summary (the summary only gets the controls focus ring).
  const details = pklnxAlternatives.filter((a) => /\.details\b/.test(a.selector));
  assert.deepEqual(details.map((a) => a.selector), []);
  for (const el of [{ tag: 'details', classes: ['details', 'custom-block'] }, { tag: 'summary', pseudoElement: 'before' }]) {
    const setters = pklnxAlternatives.filter((a) => a.decls.some((d) => d.prop === 'background-image' || d.prop === 'content') && selectorMatches(a.selector, withStates(el)));
    assert.deepEqual(setters.map((a) => a.selector), [], JSON.stringify(el));
  }
});

test('the controls focus ring skips programmatic focus targets (tabindex="-1")', () => {
  const controls = RULES.find((r) => r.selector.includes('[tabindex]')).selector;
  const focused = (el) => ({ states: ['focus', 'focus-visible'], ...el });
  assert.equal(listMatches(controls, focused({ tag: 'nav', classes: ['nav'], attrs: { tabindex: '-1' } })), false);
  assert.equal(listMatches(controls, focused({ tag: 'h2', attrs: { id: 'x', tabindex: '-1' } })), false);
  assert.equal(listMatches(controls, focused({ tag: 'div', attrs: { tabindex: '0' } })), true);
  assert.equal(listMatches(controls, focused({ tag: 'button' })), true);
});

test('no VitePress rule sets a font on the nav title', () => {
  const title = { tag: 'a', classes: ['title'], attrs: { href: '/' } };
  const setters = fixture.rules.filter((r) => r.property === 'font-family' && !r.layer && selectorMatches(r.selector, withStates(title)));
  assert.deepEqual(setters.map((r) => `${r.file}:${r.line} ${r.selector}`), []);
});

test('inline code in custom blocks: the pklnx colour rule beats every block code rule', () => {
  const ours = specificity(applyingAlternative(RULES.find((r) => r.area === 'Code').selector, { tag: 'code' }));
  for (const kind of ['info', 'note', 'tip', 'important', 'warning', 'caution', 'danger', 'details']) {
    // styles/components/custom-block.css: `.custom-block.info a, .custom-block.info code { color: var(--vp-c-brand-1) }`
    assert.ok(compareSpecificity(ours, specificity(`.custom-block.${kind} code`)) > 0, kind);
  }
});
