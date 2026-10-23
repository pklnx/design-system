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
import { EXPECTED_FILES } from './check-pack.mjs';
import {
  compareSpecificity, elementOf, formatSpecificity, matchesCompound, parseCss, selectorMatches, specificity, splitTopLevel, subjectCompound,
} from './css-selectors.mjs';
import {
  CORNERS, FONT_FACES, KEPT, MAP, PAIRS, RINGS, RING_GROUNDS, RULES, VITEPRESS_VERSION, isTargetValue, staticProperties,
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
const pklnxAlternatives = parsed.rules.filter((r) => !r.decls.some(isCustom)).flatMap((r) => splitTopLevel(r.selector, ',').map((alt) => ({
  rule: r, selector: alt, spec: specificity(alt), decls: r.decls,
})));
const findRule = (selectors) => {
  const want = norm(selectors.join(', '));
  const found = parsed.rules.filter((r) => norm(r.selector) === want);
  assert.equal(found.length, 1, `vitepress.css has one rule for ${want}`);
  return found[0];
};

const key = (file, selector, property) => `${file}|${selector}|${property}`;
const fixtureRules = (file, selector) => fixture.rules.filter((r) => r.file === file && r.selector === selector);
const CLASSIFIED = ['border-radius', 'outline', 'font-family'];
const needsClassification = (r) => CLASSIFIED.includes(r.property) && !isTargetValue(r.property, r.value);
const withStates = (el) => ({ states: ['focus', 'focus-visible', 'hover'], ...el });
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
const declProps = (decls) => decls.map((d) => d.slice(0, d.indexOf(':')).trim());
const coverEntries = [
  ...CORNERS.map((c) => ({ ...c, properties: ['border-radius'] })),
  ...RULES.filter((r) => r.covers).map((r) => ({ ...r, selectors: splitTopLevel(r.selector, ','), properties: declProps(r.decls) })),
];
// The fixture rules an entry overrides: those of its covered selectors that set a
// property the entry sets.
const coveredRules = (e) => e.covers.flatMap((c) => fixtureRules(c.file, c.selector).filter((r) => e.properties.includes(r.property) && needsClassification(r)));
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
  assert.deepEqual([...light.keys()].sort(), [...Object.keys(MAP), ...Object.keys(staticProperties(families))].sort());
});

test('vitepress.css: every colour equals tokens.json for its mapped token', () => {
  const b = blocks();
  for (const theme of ['light', 'dark']) {
    for (const [name, t] of Object.entries(MAP)) {
      const want = t[theme] === 'transparent' ? 'transparent' : tokens[theme][t[theme]];
      assert.ok(want, `${theme}: token ${t[theme]} missing in tokens.json`);
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

test('every VitePress rule that sets a corner, an outline or a font is overridden or kept', () => {
  const open = fixture.rules.filter(needsClassification).filter((r) => !COVERED_KEYS.has(key(r.file, r.selector, r.property)) && !KEPT_KEYS.has(key(r.file, r.selector, r.property)));
  assert.deepEqual(open.map((r) => `${r.file}:${r.line} ${r.selector} { ${r.property}: ${r.value} }`), []);
});

test('every overridden or kept entry names a VitePress rule of the fixture', () => {
  for (const e of coverEntries) for (const c of e.covers) {
    assert.ok(fixtureRules(c.file, c.selector).some((r) => e.properties.includes(r.property) && needsClassification(r)), `${c.file} ${c.selector}: no ${e.properties.join('/')} rule to override`);
  }
  for (const k of KEPT) {
    assert.ok(k.reason, `${k.file} ${k.selector}: no reason`);
    assert.ok(CLASSIFIED.includes(k.property), `${k.file} ${k.selector}: property ${k.property}`);
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
      const decl = rule.decls.find((d) => d.prop === r.property);
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
        const competing = fixture.rules.filter((r) => r.property === d.prop && !r.layer && !KEPT_KEYS.has(key(r.file, r.selector, r.property)) && selectorMatches(r.selector, el));
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
