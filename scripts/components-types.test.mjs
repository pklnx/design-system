// The hand-written declarations project/components/index.d.ts must track src/components.jsx
// (design-system #28). The public API of the bundle is the object assigned to `window.Pklnx`
// at the end of components.jsx; the declarations are `export declare function <Name>`.
// Nothing generates index.d.ts, so these tests compare the two lists and fail on a name that
// exists on one side only. The same is checked for the icon names and the status names, which
// are string unions in the declarations and object keys in the source.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const sortedUnique = (list) => [...new Set(list)].sort();
const names = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

// The names of the object literal in `window.Pklnx = Object.assign(window.Pklnx || {}, { A, B })`.
function windowExports(jsx) {
  const m = /window\.Pklnx\s*=\s*Object\.assign\(\s*window\.Pklnx \|\| \{\}\s*,\s*\{([^}]*)\}\s*\)/.exec(jsx);
  assert.ok(m, 'components.jsx: no `window.Pklnx = Object.assign(window.Pklnx || {}, { ... })` found');
  return names(m[1]);
}

// `export function Name` in the source.
const exportedFunctions = (jsx) => [...jsx.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);

// `export declare function Name` in the declarations.
const declaredFunctions = (dts) => [...dts.matchAll(/^export declare function (\w+)/gm)].map((m) => m[1]);

// The members of `export type <Name> = 'a' | 'b';`.
function unionMembers(dts, typeName) {
  const m = new RegExp(`^export type ${typeName} = ([^;]*);`, 'm').exec(dts);
  assert.ok(m, `index.d.ts: no \`export type ${typeName} = ...;\``);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// The keys of `const <name> = { ... };` in the source (top-level object literal of simple keys).
function objectKeys(jsx, name) {
  const m = new RegExp(`^const ${name} = \\{([\\s\\S]*?)^\\};`, 'm').exec(jsx);
  assert.ok(m, `components.jsx: no \`const ${name} = { ... };\``);
  return [...m[1].matchAll(/(?:^|,)\s*(?:'([^']+)'|([A-Za-z_]\w*))\s*:/g)].map((x) => x[1] || x[2]);
}

const jsx = read('src/components.jsx');
const dts = read('project/components/index.d.ts');

test('index.d.ts declares exactly the names components.jsx puts on window.Pklnx', () => {
  const source = sortedUnique(windowExports(jsx));
  const declared = sortedUnique(declaredFunctions(dts));
  assert.ok(source.length > 0);
  assert.deepEqual(
    declared.filter((n) => !source.includes(n)),
    [],
    'declared in index.d.ts but not exported by components.jsx',
  );
  assert.deepEqual(
    source.filter((n) => !declared.includes(n)),
    [],
    'exported by components.jsx but not declared in index.d.ts',
  );
});

test('every `export function` of components.jsx is on window.Pklnx, and no name is listed twice', () => {
  assert.deepEqual(sortedUnique(exportedFunctions(jsx)), sortedUnique(windowExports(jsx)));
  assert.equal(new Set(windowExports(jsx)).size, windowExports(jsx).length);
  assert.equal(new Set(declaredFunctions(dts)).size, declaredFunctions(dts).length);
});

test('every declared function has a Props interface of the same name', () => {
  for (const name of declaredFunctions(dts)) {
    assert.match(dts, new RegExp(`^export interface ${name}Props\\b`, 'm'), `${name}: no \`export interface ${name}Props\``);
  }
});

test('IconName in index.d.ts is the key set of ICONS in components.jsx plus star', () => {
  assert.deepEqual(sortedUnique(unionMembers(dts, 'IconName')), sortedUnique([...objectKeys(jsx, 'ICONS'), 'star']));
});

test('Status in index.d.ts is the key set of STATUS in components.jsx', () => {
  assert.deepEqual(sortedUnique(unionMembers(dts, 'Status')), sortedUnique(objectKeys(jsx, 'STATUS')));
});

// The parsers themselves, on small inputs: a mutation test needs them to see a one-sided change.
test('the parsers read the shapes of components.jsx and index.d.ts', () => {
  assert.deepEqual(windowExports('window.Pklnx = Object.assign(window.Pklnx || {}, { A, B });'), ['A', 'B']);
  assert.deepEqual(exportedFunctions('export function A() {}\nfunction b() {}\nexport function C() {}'), ['A', 'C']);
  assert.deepEqual(declaredFunctions('export declare function A(p: P): R;\nexport interface AProps {}'), ['A']);
  assert.deepEqual(unionMembers("export type T = 'a' | 'b-c';", 'T'), ['a', 'b-c']);
  assert.deepEqual(objectKeys("const K = {\n  a: A, 'b-c': B,\n  d: D,\n};", 'K'), ['a', 'b-c', 'd']);
  assert.throws(() => windowExports('nothing'), /no `window\.Pklnx/);
});
