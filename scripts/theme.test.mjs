// Checks the generated theme (theme/pklnx-carbon.css and the Sass mixins of
// theme/_index.scss) against theme/tokens.json. Both theme blocks must set the same
// tokens: the light selector includes :root, which also matches <html class="cds--g100">,
// so a token set only in the light block would leak into dark mode (issue #8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const tokens = JSON.parse(read('theme/tokens.json'));

// Parses `selector { --name: value; ... }` rules into [{ selector, props: Map }].
function parseRules(css) {
  const rules = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const props = new Map();
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const name = d.slice(0, i).trim();
      assert.ok(!props.has(name), `${name} set twice in ${m[1].trim()}`);
      props.set(name, d.slice(i + 1).trim());
    }
    rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), props });
  }
  return rules;
}

// Every declaration of a theme block equals tokens.json for that theme.
function assertMatchesTokens(props, theme) {
  for (const [name, value] of props) {
    if (name === '--pklnx-star') {
      assert.equal(value, tokens[theme].star, `${theme} ${name}`);
      continue;
    }
    const m = /^--cds-(.+)$/.exec(name);
    assert.ok(m, `${theme}: unexpected property ${name}`);
    assert.ok(m[1] in tokens[theme], `${theme}: ${name} is not a token of tokens.json`);
    assert.equal(value, tokens[theme][m[1]], `${theme} ${name}`);
  }
}

const sortedKeys = (props) => [...props.keys()].sort();

function cssBlocks() {
  const rules = parseRules(read('theme/pklnx-carbon.css'));
  assert.equal(rules.length, 2);
  const [light, dark] = rules;
  assert.equal(light.selector, ':root, .cds--white, [data-theme="light"]');
  assert.equal(dark.selector, '.cds--g100, [data-theme="dark"]');
  return { light: light.props, dark: dark.props };
}

test('pklnx-carbon.css: light and dark blocks set the same tokens', () => {
  const { light, dark } = cssBlocks();
  assert.deepEqual(sortedKeys(dark), sortedKeys(light));
  assert.ok(light.has('--pklnx-star'));
});

test('pklnx-carbon.css: every value equals tokens.json for its theme', () => {
  const { light, dark } = cssBlocks();
  assertMatchesTokens(light, 'light');
  assertMatchesTokens(dark, 'dark');
});

test('pklnx-carbon.css: every changed token is set in both blocks', () => {
  const { light, dark } = cssBlocks();
  for (const theme of ['light', 'dark']) for (const k of Object.keys(tokens.changed[theme])) {
    const name = k === 'star' ? '--pklnx-star' : `--cds-${k}`;
    assert.ok(light.has(name), `light block misses ${name}`);
    assert.ok(dark.has(name), `dark block misses ${name}`);
  }
});

test('pklnx-carbon.css: dark focus and tertiary button stay Carbon G100 (white)', () => {
  const { dark } = cssBlocks();
  assert.equal(dark.get('--cds-focus'), '#ffffff');
  assert.equal(dark.get('--cds-icon-interactive'), tokens.dark['icon-interactive']);
  assert.equal(dark.get('--cds-button-tertiary'), '#ffffff');
});

test('_index.scss: the override mixins set the same tokens with the tokens.json values', () => {
  const css = sass.compileString(
    "@use 'theme' as pklnx;\n.l { @include pklnx.overrides-light; }\n.d { @include pklnx.overrides-dark; }\n",
    { loadPaths: [ROOT, path.join(ROOT, 'node_modules')], quietDeps: true },
  ).css;
  const rules = parseRules(css);
  const light = rules.find((r) => r.selector === '.l').props;
  const dark = rules.find((r) => r.selector === '.d').props;
  assert.deepEqual(sortedKeys(dark), sortedKeys(light));
  assert.deepEqual(sortedKeys(light), sortedKeys(cssBlocks().light));
  assertMatchesTokens(light, 'light');
  assertMatchesTokens(dark, 'dark');
});
