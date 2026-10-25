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

Sass (secondary; no product uses it today):

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
| `@pklnx/design-system/theme` | The Sass module (`theme/_index.scss`) |
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

The block icons are inline `data:` SVGs in the CSS (Carbon icons from `@carbon/icons`, via `@carbon/icons-react`, Apache-2.0, see `THIRD_PARTY_NOTICES.md`), so they need no extra request. Their notice opens the file as a `/*! … */` legal comment, which Vite's CSS minifier (esbuild) keeps, so the built docs carry it. A site with a Content-Security-Policy must allow `img-src data:`; the products' docs on GitHub Pages send no CSP.

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

### Updating a consumer

Dependabot does not update URL dependencies. Each release gets a small pull request in each consumer:

1. `pnpm add https://github.com/pklnx/design-system/releases/download/vX.Y.Z/pklnx-design-system-X.Y.Z.tgz`
2. Verify the release as above, including that its commit is on `main`.
3. The review checks that the integrity in `pnpm-lock.yaml` equals the integrity of the verified tarball.

No release-age delay (`minimumReleaseAge`) applies: it only covers registry packages.

### Releasing

1. Bump `version` in `package.json` in a pull request and merge it.
2. Actions → Release → Run workflow, on `main`. Tick "dry run" first if you want to see the tarball and the notes without releasing anything.

Nobody pushes a tag: `.github/workflows/release.yml` creates the tag `vX.Y.Z` together with the release, on the `main` commit it built. It checks that it runs on `main`, that the `package.json` version is `X.Y.Z` and that neither the tag nor a release `vX.Y.Z` exists yet, then builds with `--ignore-scripts`, runs the tests and the package check, packs the tarball and writes `SHA256SUMS` and the notes (shown in the run's summary). Unless it is a dry run, it then attests the tarball, creates the tag through the API (which fails if the tag exists, so a tag pushed in the meantime is never reused) and creates the release on it. A failed check stops the workflow before anything is attested or published; a run started from any other ref than `main` fails in its first step. If creating the release fails, the workflow removes the tag it created (and a draft release gh left behind), so the next run starts over; a published release and its tag are never removed. A release that exists is never replaced: running the workflow again for the same version fails, so the next release needs a version bump. The token diff in the notes compares against the newest `v*` tag on `main` before the released commit. If the build fails with `No tags can describe …`, a `v*` tag exists that is not on `main`: delete that stray tag (`git push origin :refs/tags/vX.Y.Z`) and run the workflow again.

What protects a release is the `main`-only check plus the permission to run the workflow: only people with write access to this repository can start it. Anyone with write access can also push to `main` or start the workflow from a branch with a changed `release.yml`; the second case shows up in the attestation, which then does not name `refs/heads/main`.

## Layout

| Path | Contents |
| --- | --- |
| `theme/brand.json` | The brand decisions: primary hue (`purple`) and logo colors. **Change things here.** |
| `theme/pklnx-carbon.css`, `theme/_index.scss` | Generated: the tokens that differ from Carbon in either theme, the same set for both themes |
| `theme/tokens.json` | Generated: every Carbon color token for White and G100 after the customization |
| `theme/vitepress.css` | Generated: the VitePress theme, from `theme/tokens.json` and `scripts/vitepress-map.mjs` |
| `theme/contrast-report.json` | Generated: contrast check of the key pairs |
| `theme/logo-geometry.json` | Generated: paths of the wordmark and the mark |
| `project/assets/Logos/products/` | Generated: marks, lockups and app icons (SVG and PNG) of mail-archive and paperless-go, with `manifest.json` and a README |
| `scripts/build_logo.py`, `scripts/build_product_logos.py`, `scripts/build_assets.py` | The pklnx logos; the product marks, lockups and icon SVGs; pattern and social images (pklnx and products) |
| `scripts/render_pngs.mjs` | Renders the product PNGs with `@resvg/resvg-js` (pinned) and writes `products/manifest.json`; tested by `scripts/product-logos.test.mjs` |
| `scripts/requirements-logo.txt` | The Python packages of the logo scripts, exact versions with hashes |
| `src/` | Sources: Carbon component selection (`carbon.scss`), own styles (`pklnx.css`), React components (`components.jsx`) |
| `scripts/` | Build scripts; `check-pack.mjs` (package contents) and `release-notes.mjs` with their tests (`npm test`); `workflows.test.mjs`, the rules every workflow follows |
| `scripts/vitepress-map.mjs` | The VitePress theme: variable → token map, the contrast pairs, the overridden and the kept VitePress rules |
| `scripts/css-selectors.mjs` | The CSS parser, specificity and selector matching the VitePress tests and the capture use |
| `scripts/capture-vitepress-fixture.mjs` | Captures `scripts/fixtures/vitepress-<version>.json` from the VitePress npm tarball, run by hand; the tests read the fixture |
| `project/` | Content of the claude.ai design system (README, tokens, components, previews, assets, fonts) |

## Building

```sh
npm ci --ignore-scripts                 # no install scripts (IBM's telemetry), as in CI
pip install --require-hashes --only-binary :all: -r scripts/requirements-logo.txt
python3 scripts/build_logo.py           # logos from IBM Plex Mono (before the build: build.mjs reads theme/logo-geometry.json)
python3 scripts/build_product_logos.py  # mail-archive and paperless-go marks, lockups and icon SVGs
npm run build                           # tokens, themes (Carbon, VitePress), bundle.css, bundle.js
python3 scripts/build_assets.py         # pattern, social images (after the build, reads theme/tokens.json)
node scripts/render_pngs.mjs            # product icon and social PNGs, products/manifest.json (last: needs the social SVGs)
node scripts/build_icons.mjs            # Carbon icons as SVG
node scripts/render-previews.mjs        # every preview in both themes into .render/ (Chromium)
npm run site                            # documentation site into site/
```

`requirements-logo.txt` pins fontTools and brotli with the hashes of their wheels. CI runs the logo scripts and `render_pngs.mjs` (step "Logos are generated", Python 3.13) and fails when they change the tree; `npm test` also fails on a PNG that was not rendered again after its SVG changed.

## Documentation site

The same content as on claude.ai, as a static site on GitHub Pages: **https://pklnx.github.io/design-system/**

- `.github/workflows/pages.yml` builds it on every push to `main` (`npm ci --ignore-scripts`, `npm run build`, `npm run site`, with the actions pinned by SHA as in `ci.yml`) and deploys it with GitHub Pages in a second job that runs no repository code. `scripts/workflows.test.mjs` checks these rules for every workflow.
- Overview (brand book), colors, typography, spacing and size, assets, and one page per component with its live preview and guidelines. Theme switch between G100 and White.
- Repo and site are public.


## Publishing to claude.ai

The design system lives on claude.ai as the artifact "pklnx design system". Claude publishes it from this repo:

- Files under `project/` are uploaded as files, SVGs under `project/assets/` as asset uploads. Their IDs are in `project/design-system.json` (`assetGroups`).
- When an SVG changes, it has to be uploaded again and its ID replaced in the index.
- Edits made directly in the claude.ai editor do not land here automatically. Pull them back and commit them before the next build.

## License

- Code in this repo (theme, scripts, components, documentation): [MIT](LICENSE).
- Brand assets (name, wordmark, mark, pattern, social images, and the marks, lockups, app icons and social images of mail-archive and paperless-go in `project/assets/Logos/products` and `project/assets/Social`): all rights reserved, see the exceptions in [LICENSE](LICENSE). They are not in the package.
- Carbon (IBM, Apache-2.0), its dependencies (MIT, Apache-2.0) and IBM Plex (SIL Open Font License 1.1): see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), generated by `npm run build`. Carbon and IBM are trademarks of IBM; this project is not affiliated with or endorsed by IBM.
