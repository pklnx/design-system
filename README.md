# pklnx design system

The design system of [pklnx.space](https://pklnx.space): **IBM Carbon v11 with Purple as the interactive color** and the wordmark pklnx★space set in IBM Plex Mono.

This repo is the source of truth for two things:

1. **The Carbon theme for code** (`theme/`), usable in any Carbon application.
2. **The design system on claude.ai** (`project/`), the browsable reference with tokens, component previews and assets.

## Package

The theme is released as an npm-format tarball attached to a [GitHub release](https://github.com/pklnx/design-system/releases) of this repository. It is not on the npm registry and not on GitHub Packages: the asset is public and needs no account or token, also in Docker builds.

### Install

```sh
pnpm add https://github.com/pklnx/design-system/releases/download/vX.Y.Z/pklnx-design-system-X.Y.Z.tgz
```

pnpm records the URL and the tarball's sha512 integrity in `pnpm-lock.yaml`; a changed asset fails `pnpm install --frozen-lockfile`.

**Never run `pnpm add @pklnx/design-system` (or `npm install @pklnx/design-system`) without the URL.** The bare name asks the npm registry, where the name is not ours.

### Use

CSS: load it after Carbon's CSS and set the theme on `<html>`:

```html
<html class="cds--g100">  <!-- or cds--white -->
```

```js
import '@carbon/styles/css/styles.css';
import '@pklnx/design-system/theme/pklnx-carbon.css';
```

Sass (secondary; no product uses it today). The module is reached through the `sass` export condition, which Sass tooling (Vite, sass-loader, Dart Sass's `pkg:` importer) sets; a plain JS `import` of `@pklnx/design-system/theme` is not supported and fails with a resolution error:

```scss
@use '@pklnx/design-system/theme' as pklnx;
@use '@carbon/styles/scss/theme' with ($theme: pklnx.$g100);

.cds--g100 { @include pklnx.overrides-dark; }   // component tokens (button) too
.cds--white { @include pklnx.overrides-light; }
```

The logo star is available as `--pklnx-star`.

| Export | File |
| --- | --- |
| `@pklnx/design-system/theme/pklnx-carbon.css` | The theme: the tokens that differ from Carbon in either theme, set for `.cds--white` and `.cds--g100` alike, each with its theme's value |
| `@pklnx/design-system/theme/vitepress.css` | The VitePress theme for the products' docs, see [VitePress](#vitepress) |
| `@pklnx/design-system/theme` | The Sass module (`theme/_index.scss`), only under the `sass` condition |
| `@pklnx/design-system/theme/tokens.json` | Every Carbon color token for White and G100 after the customization, plus the `changed` set |
| `@pklnx/design-system/fonts/*` | The IBM Plex woff2 files (`project/fonts/`) and `OFL.txt` |
| `@pklnx/design-system/package.json` | The manifest |

- **Peer dependency**: `@carbon/styles` `^1.118.0`, needed for `pklnx-carbon.css` and the Sass module. It is optional (`peerDependenciesMeta`), so a docs site that only uses `vitepress.css` does not install Carbon. The package has no dependencies of its own and no install scripts.
- **Fonts**: the package ships the woff2 files. `pklnx-carbon.css` has no `@font-face` rules; a consumer writes its own, for example `src: url("@pklnx/design-system/fonts/IBMPlexSans-Regular.woff2") format("woff2")`. `vitepress.css` brings its own `@font-face` rules.
- **Contents**: exactly the files above plus `LICENSE`, `README.md` and `THIRD_PARTY_NOTICES.md`. No brand assets; `scripts/check-pack.mjs` enforces the list in CI and in the release.
- **License**: `MIT AND Apache-2.0 AND OFL-1.1`. The code is MIT, the token values are computed from Carbon (Apache-2.0, notices in `THIRD_PARTY_NOTICES.md`), the fonts are IBM Plex (SIL Open Font License 1.1, `OFL.txt`).

### VitePress

`theme/vitepress.css` gives a VitePress docs site the pklnx look. It is written for the default theme of VitePress `2.0.0-alpha.20`, the version both products pin, and needs no Carbon CSS:

- **Colours**: the VitePress colour variables get the Carbon tokens, White in light mode and G100 in `.dark`, with Purple as the accent. Badges use Carbon's tag colours; links in blocks stay link colours.
- **Custom blocks** (`::: info` … and GitHub alerts `> [!NOTE]` …) look like Carbon's low-contrast inline notification: the notification ground (`layer-01` in G100), a 3 px left stripe in the support colour (`support-info` for info, note and important, `support-success` for tip, `support-warning` for warning and caution, `support-error` for danger), Carbon's 1 px frame in the same colour at opacity 0.4, and Carbon's filled icon before the title (InformationFilled, CheckmarkFilled, WarningFilled, ErrorFilled). The title stays on its own line. `::: details` has no stripe, frame or icon. The stripe, frame and icon are decorative (the title carries the meaning), so they have no 3:1 contrast requirement.
- **Fonts**: IBM Plex Sans and IBM Plex Mono from this package, with Carbon's fallback stacks. The nav title is set in Plex Mono, so the logo and the site title read as the product lockup.
- **Corners**: square, as in Carbon (`border-radius: 0 !important` on the rounded VitePress components; the appearance switch, spinners and avatars stay round).
- **Focus**: Carbon's focus: an outer ring on text links, an inset ring on controls, the double ring on buttons.

`docs/.vitepress/theme/index.ts`, in this order:

```ts
import DefaultTheme from 'vitepress/theme-without-fonts'; // VitePress without Inter
import '@pklnx/design-system/theme/vitepress.css';
import './custom.css'; // the product's own rules, if any

export default DefaultTheme;
```

The file's `:root` and `.dark` blocks must come after VitePress's own, so it is imported after the VitePress theme. In `docs/.vitepress/config.mts`, the logo takes one file per theme: `themeConfig: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } }`.

The `@font-face` rules point to the font files relative to the CSS file; Vite emits them as hashed assets. The built site then carries IBM Plex, so it must also carry its license, `@pklnx/design-system/fonts/OFL.txt`.

The block icons are inline `data:` SVGs in the CSS (Carbon icons from `@carbon/icons`, via `@carbon/icons-react`, Apache-2.0, see `THIRD_PARTY_NOTICES.md`), so they need no extra request. Each icon carries its notice inside its SVG (`<!-- Carbon icon …, Copyright IBM Corp., Apache-2.0: … -->`), so the built docs carry it: minifiers keep the value of a `url()` (esbuild byte for byte; Lightning CSS drops the quotes and escapes the parentheses). A `vitepress build` with VitePress `2.0.0-alpha.20` (Vite 8.3.5, default config) keeps all 14 notices. The `/*! … */` comment that opens the file is dropped there: Vite 8 minifies CSS with Lightning CSS, which keeps a legal comment only at the start of a file, and VitePress puts all CSS into one file after its own (with `cssMinify: 'esbuild'`, Vite 8 drops legal comments too). The notice names the licence by URL; for its full text the built site also carries `THIRD_PARTY_NOTICES.md` as a file, as it carries `OFL.txt`, for example a copy of `node_modules/@pklnx/design-system/THIRD_PARTY_NOTICES.md`. A site with a Content-Security-Policy must allow `img-src data:`; the products' docs on GitHub Pages send no CSP.

When the products move to another VitePress version, capture its fixture (see the header of `scripts/capture-vitepress-fixture.mjs`), set `VITEPRESS_VERSION` in `scripts/vitepress-map.mjs` and run `npm test`. Every new VitePress rule that sets a corner, an outline or a font fails the tests until `scripts/vitepress-map.mjs` overrides it or keeps it with a reason.

### Verify a release

```sh
gh release download vX.Y.Z --repo pklnx/design-system
sha256sum -c SHA256SUMS            # or on macOS: shasum -a 256 -c SHA256SUMS
gh attestation verify pklnx-design-system-X.Y.Z.tgz --repo pklnx/design-system
```

Stricter, pinned to the release workflow run on `main`:

```sh
gh attestation verify pklnx-design-system-X.Y.Z.tgz --repo pklnx/design-system \
  --signer-workflow pklnx/design-system/.github/workflows/release.yml \
  --source-ref refs/heads/main
```

The integrity in the consumer's `pnpm-lock.yaml` must equal:

```sh
echo "sha512-$(openssl dgst -sha512 -binary pklnx-design-system-X.Y.Z.tgz | openssl base64 -A)"
```

The release notes print the install command and this integrity, too.

The release workflow runs only on `main` and creates the tag itself, on the commit it built. The attestation records the ref the workflow ran on, so `--source-ref refs/heads/main` fails for a tarball built from any other ref. When you update a consumer, also check that the release's commit is on `main`, for example `git merge-base --is-ancestor vX.Y.Z origin/main` in a clone of this repository.

### Version policy

[Semantic versioning](https://semver.org/):

- **Major**: a new Carbon major, a removed or renamed token, a removed export.
- **Minor**: new tokens or exports, changed token values.
- **Patch**: anything else.

While the version is 0.x, a breaking change bumps the minor version.

Removing an export condition counts as removing an export. In 0.3.0 `exports["./theme"]` lost its `default` condition, which pointed at the Sass file, so a plain JS `import` of `@pklnx/design-system/theme` resolved to Sass instead of failing. Only the `sass` condition remains: Sass tooling is unaffected, and a consumer that imported the module from JS (none of ours does) gets a resolution error.

### Updating a consumer

Dependabot does not update URL dependencies. Each release gets a small pull request in each consumer:

1. `pnpm add https://github.com/pklnx/design-system/releases/download/vX.Y.Z/pklnx-design-system-X.Y.Z.tgz`
2. Verify the release as above, including that its commit is on `main`.
3. The review checks that the integrity in `pnpm-lock.yaml` equals the integrity of the verified tarball.

No release-age delay (`minimumReleaseAge`) applies: it only covers registry packages.

### Releasing

1. Every issue of the release's milestone is closed and CI on `main` is green ([Milestones](#milestones)).
2. Bump `version` in `package.json` to the milestone title in a pull request and merge it.
3. Actions → Release → Run workflow, on `main`. Tick "dry run" first if you want to see the tarball and the notes without releasing anything.

Nobody pushes a tag: `.github/workflows/release.yml` creates the tag `vX.Y.Z` together with the release, on the `main` commit it built. It checks that it runs on `main`, that the `package.json` version is `X.Y.Z` and that neither the tag nor a release `vX.Y.Z` exists yet, then builds with `--ignore-scripts`, runs the tests and the package check, packs the tarball and writes `SHA256SUMS` and the notes (shown in the run's summary). Unless it is a dry run, it then attests the tarball, creates the tag through the API (which fails if the tag exists, so a tag pushed in the meantime is never reused) and creates the release on it. A failed check stops the workflow before anything is attested or published; a run started from any other ref than `main` fails in its first step. If creating the release fails or the job is cancelled, the workflow removes the tag it created (and a draft release gh left behind), so the next run starts over; should a tag remain without a release anyway, delete it (`git push origin :refs/tags/vX.Y.Z`) before the next run; a published release and its tag are never removed. A release that exists is never replaced: running the workflow again for the same version fails, so the next release needs a version bump. The token diff in the notes compares against the newest `v*` tag on `main` before the released commit. If the build fails with `No tags can describe …`, a `v*` tag exists that is not on `main`: delete that stray tag (`git push origin :refs/tags/vX.Y.Z`) and run the workflow again.

What protects a release is the `main`-only check plus the permission to run the workflow: only people with write access to this repository can start it. Anyone with write access can also push to `main` or start the workflow from a branch with a changed `release.yml`; the second case shows up in the attestation, which then does not name `refs/heads/main`.

### Milestones

Releases are planned with GitHub milestones, as in mail-archive: one milestone per planned release, titled `X.Y.Z` (no `v`), with a one-sentence goal as description.

- The coordinator proposes the scope and order of a milestone; the maintainer confirms. Adding or removing an issue after that needs the maintainer's OK, except for bugs in the milestone's own work. A pull request gets the milestone of its issue.
- The title follows the [version policy](#version-policy) for the milestone's issues. If the scope changes the bump (for example a removed export slips in), the coordinator renames the milestone and tells the maintainer.
- A bug goes into the next patch milestone. Releases come from `main` without release branches, so once the first pull request of the next minor milestone is merged, open bug fixes move into that milestone.
- After the release the coordinator closes the milestone. An issue closed as not planned is removed from its milestone.

## Layout

| Path | Contents |
| --- | --- |
| `theme/brand.json` | The brand decisions: primary hue (`purple`) and logo colors. **Change things here.** The one source of the logo colors: the scripts read it, and the asset READMEs name the keys instead of the values |
| `theme/pklnx-carbon.css`, `theme/_index.scss` | Generated: the tokens that differ from Carbon in either theme, the same set for both themes |
| `theme/tokens.json` | Generated: every Carbon color token for White and G100 after the customization |
| `theme/vitepress.css` | Generated: the VitePress theme, from `theme/tokens.json` and `scripts/vitepress-map.mjs` |
| `theme/contrast-report.json` | Generated: contrast check of the key pairs |
| `theme/logo-geometry.json` | Generated by `scripts/build_logo.py`: paths of the wordmark, the mark and the icon star. The one source of the geometry: the component bundle, the site, the asset scripts, `scripts/build_icons.mjs` and the tests read it, none keeps its own copy (`scripts/brand-single-source.test.mjs`) |
| `project/assets/Logos/products/` | Generated: marks, lockups and app icons (SVG and PNG) of mail-archive, paperless-go and dokumentum, and the Icon Composer layers of Dokumentum's app icon, with `manifest.json` and a README. Uploaded to claude.ai and indexed in group `Logos` as `products/<file>` (see Publishing to claude.ai) |
| `.node-version` | The Node major for development and CI (workflows, `devEngines`, tests); see Building |
| `.github/workflows/`, `.github/actions/setup/` | `ci.yml` (checks on every push and pull request; on `main` it also builds and deploys the documentation site once the checks pass) and `release.yml`; the composite action `setup` holds the Node and `npm ci` steps they share and the only pin of `actions/setup-node` |
| `.github/dependabot.yml` | Weekly version updates with a 14-day cooldown (as in mail-archive) for npm, GitHub Actions (workflows and the composite action) and pip (`scripts/requirements-logo.txt`); minor and patch npm updates arrive as one pull request; `react` and `react-dom` majors are ignored (see Building) |
| `scripts/build_all.mjs` | `npm run build:all`: the one entry point that runs all generation steps below, in their dependency order (see Building) |
| `scripts/build_logo.py`, `scripts/build_product_logos.py`, `scripts/build_assets.py` | The pklnx logos; the product marks, lockups and icon SVGs; pattern and social images (pklnx and products) |
| `scripts/render_pngs.mjs` | Renders the product PNGs with `@resvg/resvg-js` (pinned) and writes `products/manifest.json`; tested by `scripts/product-logos.test.mjs` |
| `project/design-system.json` | The asset index of the claude.ai design system, edited by hand (no script writes it): per group in `project/assets/` every file with its `blob` id (from the claude.ai upload), byte `size` and `type`. The Pages "Assets" page lists it. `scripts/design-system-index.test.mjs` walks each group directory recursively and checks, with no exemptions, that every SVG and PNG at any depth is indexed under its path below the group (`products/<file>` in `Logos`), that the only other files are text files (`README.md` at any level and `Logos/products/manifest.json`), that each `size` equals the file's size, and that each `blob` has its pin in `scripts/fixtures/claude-uploads.json` |
| `scripts/requirements-logo.txt` | The Python packages of the logo scripts, exact versions with hashes |
| `src/` | Sources: Carbon component selection (`carbon.scss`), own styles (`pklnx.css`), React components (`components.jsx`) |
| `scripts/` | Build scripts; `check-pack.mjs` (package contents) and `release-notes.mjs` with their tests (`npm test`); `workflows.test.mjs`, the rules every workflow follows; `brand-single-source.test.mjs`, which checks that every built asset and the component bundle carry the values of `theme/brand.json` and `theme/logo-geometry.json` and that no script or source keeps its own copy |
| `project/components/index.d.ts` | The TypeScript declarations of the components, edited by hand: `scripts/components-types.test.mjs` fails when a name on `window.Pklnx` in `src/components.jsx` has no `export declare function` here or the other way round, and for the `IconName` and `Status` unions against `ICONS` and `STATUS` |
| `scripts/build-output.test.mjs` | Tests what the build scripts write: `build_site.mjs` and `build_icons.mjs` run into a temp directory (pages, previews, assets page, links, icon list), the previews against boilerplate that creeps back (style, prelude and logo script live in `preview-*` only) with the two shared scripts run against a stand-in page, the `cover` flag (the site finds the banner by its flag, never by its name; the committed flag sits on `components/Cover/preview.html`, and that folder holds the preview only, as claude.ai requires), the React of the site and the previews (one React per page: `lib/react.js` only, once per preview and before `bundle.js`, no preview loading its own, no script reading the `umd/` builds; the bundle run in `vm` with `bundle.js`, its licence headers, the single-copy check and that `react-bundle.mjs` writes nothing), `token-notes.mjs`, and the committed pklnx wordmark and pattern SVGs against `theme/logo-geometry.json`, `theme/brand.json` and `theme/tokens.json`. `build_icons.mjs [dir]` also takes an output directory |
| `scripts/vitepress-map.mjs` | The VitePress theme: variable → token map, the contrast pairs, the overridden and the kept VitePress rules |
| `scripts/css-selectors.mjs` | The CSS parser, specificity and selector matching the VitePress tests and the capture use |
| `scripts/capture-vitepress-fixture.mjs` | Captures `scripts/fixtures/vitepress-<version>.json` from the VitePress npm tarball, run by hand; the tests read the fixture |
| `scripts/build.mjs` | `npm run build`, the third step of `build:all`: tokens, the Carbon and VitePress themes, `project/components/bundle.css` and `bundle.js` from `src/`, `project/tokens.json` and `tokens.css`, the third-party notices and `project/fonts/OFL.txt`; reads `theme/brand.json` and `theme/logo-geometry.json` |
| `scripts/build_site.mjs` | `npm run site`: the documentation site into `site/` (see Documentation site) |
| `scripts/react-bundle.mjs` | Bundles `react` and `react-dom` from `node_modules` with esbuild into the one classic script that `build_site.mjs` writes to `lib/react.js` of the site and `render-previews.mjs` to `.render/lib/react.js` (build output, never committed; see Building). It returns the bundle and writes nothing itself, and fails on a second copy of React |
| `scripts/build_icons.mjs` | Writes the Carbon icons the system uses as SVG into `project/assets/Icons/` |
| `scripts/render-previews.mjs` | Run by hand, not in CI: screenshots every component preview in both themes with headless Chromium (`CHROME`, see Requirements) into `.render/` |
| `scripts/token-notes.mjs` | The usage note of each token for the design system page, read by `build.mjs` and the tests |
| `scripts/png.mjs` | PNG helpers (chunks, text chunks, decoding RGBA) for `render_pngs.mjs` and the tests |
| `scripts/fixtures/` | Captured data the tests read: the VitePress fixture, `npm pack` samples, token files for the release notes, and `claude-uploads.json`, the upload pins: per claude.ai `blob` of the index the asset's `<Group>/<name>` and the sha256 of the repository file uploaded under it (see Publishing to claude.ai) |
| `scripts/*.test.mjs` | The tests, run by `npm test` (no network, no browser). Besides the ones named above: `build_all.test.mjs` (the order and exit codes of `build:all`, README and CI against it), `check-pack.test.mjs` (the package contents and `exports`), `release-notes.test.mjs`, `css-selectors.test.mjs`, `theme.test.mjs` (the generated Carbon theme against `theme/tokens.json`), `vitepress-theme.test.mjs`, `script-robustness.test.mjs` (a path with a space, a failed render, the one React a render loads, the Python script rules) and `readme.test.mjs` (this table and the list of changed tokens) |
| `project/components/` | One directory per component with `README.md` (guidelines) and `preview.html` (the live preview of the site and the design system page); `bundle.css` and `bundle.js` are generated by `scripts/build.mjs` from `src/`; `index.d.ts` is described above |
| `project/` | Content of the claude.ai design system (README, tokens, components, previews, assets, fonts) |
| `project/components/<Name>/preview.html` | One preview per component, a complete HTML page that claude.ai serves as it is. The first line is the `@dsCard` comment (`group="..."`, `subtitle="..."`, `height=N`, `width=N`, the flag `page`, and the flag `cover` on exactly one preview, the overview's banner (`cover` is this repository's own flag: the `@dsCard` grammar of the claude.ai artifact type, in its `artifact-type/reference/format.md`, has no such attribute and lists `group`, `height`, `width`, `subtitle`, `page` and `floor`; claude.ai finds the cover by its path and shows it with the flag present, checked on #51): `build_site.mjs` gives it no page of its own and no sidebar entry, and fails unless exactly one preview has it). claude.ai finds the cover by the path `components/Cover/`, so the flag stays on `components/Cover/preview.html` and that folder stays bare: no README, no `.d.ts`, and `Cover` not in the header of `bundle.js` (otherwise claude.ai treats it as an ordinary component and the system has no cover; a test checks all of it). Every other component has a README. What the previews share is not repeated in them: `project/components/preview-shared.css` (the body style) is linked in the `<head>` as `../preview-shared.css`, `preview-shared.js` (`var P = window.Pklnx, h = React.createElement;` and the mounting of every `data-logo` element) is loaded at the end of the `<body>` as `../preview-shared.js`, and Invoice and Letterhead add `preview-din5008.css` and `preview-din5008.js` (the DIN 5008 page: marks, logo, sender, address window and footer, put into the element with `data-din5008`). The site build copies these four files to the site root, where `../` from `preview/<Name>.html` leads; `scripts/render-previews.mjs` resolves them next to the component directories. They are uploaded to claude.ai with the other files under `project/` (see "Publishing to claude.ai") |

## Requirements

- **Node**: the major in `.node-version` (26), for every npm script and the tests; see Building.
- **Python 3.13**, as in CI, with the hashed packages of `scripts/requirements-logo.txt` (fontTools, brotli), for the three logo scripts only (`build_logo.py`, `build_product_logos.py`, `build_assets.py`). `npm test` also runs a lint of those scripts with any `python3` (standard library only).
- **Chromium or Chrome**, only for `scripts/render-previews.mjs`, which takes its path from the `CHROME` environment variable. Nothing else, and not CI, needs a browser.
- Consumers of the package need none of this: the tarball has no dependencies and no install scripts.

## Building

Node 26, as declared in `.node-version`: the one place for the version. The workflows read it through the local action `.github/actions/setup` (`actions/setup-node` with `node-version-file`, then `npm ci --ignore-scripts`), `scripts/workflows.test.mjs` checks that nothing else names a Node version, and `devEngines` in `package.json` makes npm warn on an older Node when you work in this repository. `devEngines` (unlike `engines`) is ignored when the package is installed as a dependency, so the tarball puts no requirement on consumers ([npm docs, `devEngines`](https://docs.npmjs.com/cli/configuring-npm/package-json#devengines)).

`react` and `react-dom` stay on 18.x in `package.json` (JSON has no comments, so the reason is here): the previews on claude.ai load React 18 (`libraries` in `project/design-system.json`, from jsDelivr), and the site and `scripts/render-previews.mjs` run the same React. They do not read `node_modules/react*/umd/` (React 19 dropped it): `scripts/react-bundle.mjs` bundles `react` and `react-dom` from `node_modules` with esbuild into one classic script that sets `window.React` and `window.ReactDOM`, written on every run to `lib/react.js` of the site and to `.render/lib/react.js`, never committed; `bundle.js` reads those globals and bundles no React. Moving to 19 is a separate decision that changes `package.json` and `libraries` together (React 19 on claude.ai means carrying both files in `components/lib/`); until then `.github/dependabot.yml` ignores the React majors. `npm outdated` still lists 19 under "Latest"; "Wanted" stays 18.

`lightningcss` (`1.33.0`) is one of two exact pins among the caret ranges, with `@resvg/resvg-js` (`2.6.2`, see `render_pngs.mjs` in Layout): only `scripts/vitepress-theme.test.mjs` uses it, to check how Vite 8's CSS minifier treats `theme/vitepress.css` (the legal comment, the escaping in `url()`), and that result can change between releases of Lightning CSS. Move the pin together with `VITEPRESS_VERSION` (see VitePress).

```sh
npm ci --ignore-scripts                 # no install scripts (IBM's telemetry), as in CI; before pip: the logo scripts read the fonts from node_modules
pip install --require-hashes --only-binary :all: -r scripts/requirements-logo.txt
npm run build:all                       # every generated file, in the order below (PYTHON=/path/to/python3 selects the interpreter, default python3)
CHROME=/path/to/chromium node scripts/render-previews.mjs  # every preview in both themes into .render/ (needs a Chromium; CHROME is required, not run in CI)
npm run site                            # documentation site into site/ (node scripts/build_site.mjs <dir> builds into another directory; it empties a previous site build there first, and refuses a non-empty directory without index.html and .nojekyll, the checkout, any directory above or inside it other than site/, and a symbolic link to one of them)
```

`npm run build:all` (`scripts/build_all.mjs`) is the one place that defines the order of the generation steps. It runs these commands, in this order, and stops at the first one that fails:

```sh
python3 scripts/build_logo.py           # logos from IBM Plex Mono; writes theme/logo-geometry.json
python3 scripts/build_product_logos.py  # product marks, lockups, icon SVGs and the Dokumentum icon layers
node scripts/build.mjs                  # = npm run build: tokens, themes (Carbon, VitePress), bundle.css, bundle.js; reads theme/logo-geometry.json, writes theme/tokens.json
python3 scripts/build_assets.py         # pattern, social images; reads theme/tokens.json and theme/logo-geometry.json
node scripts/render_pngs.mjs            # product icon and social PNGs, products/manifest.json; needs the social SVGs
node scripts/build_icons.mjs            # Carbon icons as SVG; reads theme/brand.json and theme/logo-geometry.json
```

Each step reads files that an earlier step wrote. The order only works because the intermediate files (`theme/logo-geometry.json`, `theme/tokens.json`, the SVGs) are committed: a step run on its own, or out of order, still finds its inputs and silently uses the committed, possibly stale, version. Running `npm run build:all` is what makes them consistent. The single steps can be run by hand in this order, for example `npm run build` after changing `theme/brand.json`, but then the later steps are not refreshed.

`requirements-logo.txt` pins fontTools and brotli with the hashes of their wheels. CI (step "Generated files are committed", Python 3.13) runs `npm run build:all` after the two install lines and fails when it changes the tree; `npm test` also fails on a PNG that was not rendered again after its SVG changed, and on a README or CI that names the steps differently from `scripts/build_all.mjs`.

## Documentation site

The same content as on claude.ai, as a static site on GitHub Pages: **https://pklnx.github.io/design-system/**

- `.github/workflows/ci.yml` builds and deploys it, only on `main` (a push, or the workflow started by hand there) and only after the `check` job of the same run is green: the `pages-build` job (`npm run build`, `npm run site`) needs `check`, and the `pages-deploy` job needs `pages-build`, so a red CI run on `main` deploys nothing. Pull requests and other branches only run the checks. The deploy job runs no repository code (GitHub Pages deployment of the uploaded artifact, the only job with `pages: write` and `id-token: write`); a newer push to `main` cancels a deploy that is still running. The Node and npm steps come from `.github/actions/setup`, and every action is pinned by SHA with its version in a comment, to the same SHA wherever it is used (`actions/checkout` has to be in every job, and `actions/download-artifact` in the two release jobs that run no repository code). Only the Node prelude exists once, in the composite action. `scripts/workflows.test.mjs` checks these rules for every workflow and fails as soon as two occurrences of an action differ.
- Overview (brand book), colors, typography, spacing and size, assets, and one page per component with its live preview and guidelines. Theme switch between G100 and White.
- Repo and site are public.


## Publishing to claude.ai

The design system lives on claude.ai as the artifact ["pklnx design system"](https://claude.ai/artifact/1nh6P45ENo8t4FD2u6FwZt), an Artifact of type "Design System" in Claude. The standalone Claude Design site (claude.ai/design) closes on 2026-12-14 and holds no copy of it ([#59](https://github.com/pklnx/design-system/issues/59)). Claude publishes it from this repo:

- Files under `project/` are uploaded as files; SVGs and PNGs at any depth under `project/assets/<Group>/` as asset uploads, named by their path below the group folder (`products/mail-archive-tile.svg` in `Logos`). Their IDs are in `project/design-system.json` (`assetGroups`). Text files under `project/assets/` (the READMEs, `Logos/products/manifest.json`) are published as files.
- Each upload is pinned in `scripts/fixtures/claude-uploads.json`: `{"<blob>": {"path": "<Group>/<name>", "sha256": "…"}}`. The pin hashes the file in this repo as it was uploaded, never the copy claude.ai stores or the `sha256` of its asset listing (SVGs are stored re-serialized). The pins of the 29 assets indexed before #64 rest on the content equality shown in #51 and #59 (same rendering), not on byte equality.
- When an asset changes, `npm test` fails on its `size`, its pin or both, also when `npm run build:all` regenerates it (CI's "Generated files are committed" check stays green then). The fix goes into the same PR: upload the changed file from the PR branch; put the new `blob` and `size` into the index; replace its pin (the new blob as key, the old entry removed); and run `grep -rn <old id> project/`. Only a new blob key can carry a new hash, but the test cannot tell whether a changed hash came with a real upload, so the review checks it: every changed pin has a new blob in the index and its upload ID in the PR body. After the merge, the index and any changed text files are published. A new SVG or PNG under `project/assets/<Group>/` needs an upload, its upload ID in `order` and `files` of the index and a pin; never a made-up ID. A preview that shows the asset hard-codes its blob ID as `/_blob/<id>` (for example `project/components/SocialKit/preview.html`): replace the ID there, too, wherever it appears (`grep -rn <old id> project/`). There are no exceptions besides the text files (`scripts/design-system-index.test.mjs`).
- The previews link `../preview-shared.css`, `../preview-shared.js`, `../preview-din5008.css` and `../preview-din5008.js` (`project/components/`, see "Layout"): upload these four files with the previews, next to `bundle.js` and `bundle.css`, or the previews lose their body style, `P`/`h` and logos.
- The artifact stores uploaded SVGs re-serialized (explicit closing tags, no final newline), so its byte sizes differ from the `size` values in the index, which are the sizes of the files in this repo. A different size alone does not mean an asset is stale; compare the content (after XML canonicalization, or rendered with `@resvg/resvg-js`: equal rendering, not equal bytes). PNGs are stored byte for byte: read back by ID, they equal the repo file (checked for the 12 product PNGs on #64).
- Edits made directly in the claude.ai editor do not land here automatically. Pull them back and commit them before the next build.

## License

- Code in this repo (theme, scripts, components, documentation): [MIT](LICENSE).
- Brand assets (name, wordmark, mark, pattern, social images, and the marks, lockups, app icons, app icon layers and social images of mail-archive, paperless-go and Dokumentum in `project/assets/Logos/products` and `project/assets/Social`): all rights reserved, see the exceptions in [LICENSE](LICENSE). They are not in the package.
- Carbon (IBM, Apache-2.0), its dependencies (MIT, Apache-2.0) and IBM Plex (SIL Open Font License 1.1): see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), generated by `npm run build`. Carbon and IBM are trademarks of IBM; this project is not affiliated with or endorsed by IBM.
