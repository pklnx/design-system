// Tests of the asset index project/design-system.json (design-system #24, #64).
//
// The index is maintained by hand (no script writes it). Its `assetGroups` list every asset
// of the claude.ai design system and feed the Pages "Assets" page (scripts/build_site.mjs).
// The `blob` ids are opaque ids from the claude.ai asset upload, not content hashes, so they
// cannot be recomputed here; the test checks their shape and uniqueness. The recorded `size`
// is the byte size of the file in this repository and is checked against the file on disk.
//
// Coverage rule (what must be indexed), with no exemptions: each group directory
// `project/assets/<Group>/` is walked recursively, and every file with an extension in TYPES
// (SVG, PNG) at any depth is indexed under its POSIX path below the group folder (the
// claude.ai format's record name and key, e.g. `products/mail-archive-tile.svg` in Logos).
// The only other files allowed are the text files in TEXT_FILES: `README.md` at any level
// (a group's notes) and `Logos/products/manifest.json`. Any other file fails the test as
// neither an asset type nor a known text file.
//
// Upload pins: scripts/fixtures/claude-uploads.json maps each `blob` of the index to
// `{path, sha256}`: the asset's `<Group>/<name>` and the sha256 of the repository file that
// was uploaded under that blob (never the hash of the copy claude.ai stores, which re-serializes
// SVGs). A file that changes (a regenerated logo, a recolour of the same length) fails here
// until it is uploaded again: only a new blob key can carry a new hash, so the old pin is
// replaced by the new one. The test cannot tell whether a changed hash came with a real upload
// (an author could keep the old blob and change the hash); the review checks that every changed
// pin has a new blob in the index and the upload id in the pull request body (README,
// "Publishing to claude.ai").
//
// The pins and `Logos/products/manifest.json` complement each other; neither replaces the
// other. The manifest is written by scripts/render_pngs.mjs and holds, for the product and
// social PNGs only, the PNG's sha256 and its source SVG's sha256 (scripts/product-logos.test.mjs
// uses them to catch a PNG not rendered again). The pins are written by hand with each upload,
// cover every indexed asset, SVGs included, and tie each claude.ai blob to the file content
// that was uploaded.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ASSETS = path.join(ROOT, 'project/assets');
const INDEX = JSON.parse(readFileSync(path.join(ROOT, 'project/design-system.json'), 'utf8'));
const PINS = JSON.parse(readFileSync(path.join(ROOT, 'scripts/fixtures/claude-uploads.json'), 'utf8'));

const TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png' };
// Text files under a group: `README.md` at any level, plus these paths (`<Group>/<path>`).
const TEXT_FILES = new Set(['Logos/products/manifest.json']);
const isTextFile = (group, rel) => path.posix.basename(rel) === 'README.md' || TEXT_FILES.has(`${group}/${rel}`);

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const dirs = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

// Every entry below the group directory, as POSIX paths relative to it, split into asset
// files, known text files and the rest (unknown files, symbolic links, sockets ...).
function walk(group) {
  const out = { assets: [], text: [], other: [] };
  const visit = (rel) => {
    for (const e of readdirSync(path.join(ASSETS, group, ...rel.split('/').filter(Boolean)), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visit(r);
      else if (e.isFile() && Object.hasOwn(TYPES, path.posix.extname(r))) out.assets.push(r);
      else if (e.isFile() && isTextFile(group, r)) out.text.push(r);
      else out.other.push(r);
    }
  };
  visit('');
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

test('the index groups are exactly the directories of project/assets', () => {
  assert.deepEqual([...INDEX.groups].sort(), dirs(ASSETS));
  assert.deepEqual(Object.keys(INDEX.assetGroups).sort(), dirs(ASSETS));
});

for (const group of INDEX.groups) {
  const g = INDEX.assetGroups[group];
  const file = (name) => path.join(ASSETS, group, ...name.split('/'));

  test(`${group}: every asset file is indexed`, () => {
    assert.deepEqual(Object.keys(g.files).sort(), walk(group).assets);
  });

  test(`${group}: every other file is a known text file`, () => {
    assert.deepEqual(walk(group).other, [], `${group}: neither an asset type nor a known text file`);
  });

  test(`${group}: the order lists each indexed file exactly once`, () => {
    assert.deepEqual([...g.order].sort(), Object.keys(g.files).sort());
  });

  test(`${group}: names are paths below the group folder`, () => {
    for (const name of Object.keys(g.files)) {
      assert.match(name, /^[A-Za-z0-9_./-]+$/, `${group}/${name}: only [A-Za-z0-9_./-], so the key needs no ~xx escaping`);
      assert.ok(name.split('/').every((s) => s !== '' && s !== '.' && s !== '..'), `${group}/${name}: no empty, . or .. segment, no leading /`);
    }
  });

  test(`${group}: size equals the byte size of the file`, () => {
    for (const [name, rec] of Object.entries(g.files)) {
      assert.equal(rec.size, statSync(file(name)).size, `${group}/${name}`);
    }
  });

  test(`${group}: name and type match the file`, () => {
    for (const [name, rec] of Object.entries(g.files)) {
      assert.equal(rec.name, name);
      assert.equal(rec.type, TYPES[path.posix.extname(name)], `${group}/${name}`);
    }
  });

  test(`${group}: each blob's pin names this file and its sha256`, () => {
    for (const [name, rec] of Object.entries(g.files)) {
      const pin = PINS[rec.blob];
      assert.ok(pin, `${group}/${name}: blob ${rec.blob} has no entry in scripts/fixtures/claude-uploads.json`);
      assert.equal(pin.path, `${group}/${name}`, `${group}/${name}: the pin of blob ${rec.blob} names another file`);
      assert.equal(pin.sha256, sha256(file(name)), `${group}/${name} differs from the file uploaded as blob ${rec.blob}: upload it again and replace blob, size and pin (README, "Publishing to claude.ai")`);
    }
  });
}

test('the pin file holds exactly the blobs of the index', () => {
  const blobs = INDEX.groups.flatMap((group) => Object.values(INDEX.assetGroups[group].files).map((rec) => rec.blob)).sort();
  assert.deepEqual(Object.keys(PINS).sort(), blobs);
  for (const [blob, pin] of Object.entries(PINS)) {
    assert.deepEqual(Object.keys(pin).sort(), ['path', 'sha256'], blob);
    assert.match(pin.sha256, /^[0-9a-f]{64}$/, blob);
  }
});

test('blob ids are 32 hex characters and unique across the index', () => {
  const seen = new Map();
  for (const group of INDEX.groups) {
    for (const [name, rec] of Object.entries(INDEX.assetGroups[group].files)) {
      assert.match(rec.blob, /^[0-9a-f]{32}$/, `${group}/${name}`);
      assert.equal(seen.has(rec.blob), false, `${group}/${name} repeats the blob of ${seen.get(rec.blob)}`);
      seen.set(rec.blob, `${group}/${name}`);
    }
  }
});
