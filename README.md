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
| `@pklnx/design-system/theme/pklnx-carbon.css` | The theme: only the tokens that differ from Carbon, for `.cds--white` and `.cds--g100` |
| `@pklnx/design-system/theme` | The Sass module (`theme/_index.scss`) |
| `@pklnx/design-system/theme/tokens.json` | Every Carbon color token for White and G100 after the customization, plus the `changed` set |
| `@pklnx/design-system/fonts/*` | The IBM Plex woff2 files (`project/fonts/`) and `OFL.txt` |
| `@pklnx/design-system/package.json` | The manifest |

- **Peer dependency**: `@carbon/styles` `^1.118.0`. The package has no dependencies of its own and no install scripts.
- **Fonts**: the package ships the woff2 files but no `@font-face` rules; a consumer writes its own, for example `src: url("@pklnx/design-system/fonts/IBMPlexSans-Regular.woff2") format("woff2")`.
- **Contents**: exactly the files above plus `LICENSE`, `README.md` and `THIRD_PARTY_NOTICES.md`. No brand assets; `scripts/check-pack.mjs` enforces the list in CI and in the release.
- **License**: `MIT AND Apache-2.0 AND OFL-1.1`. The code is MIT, the token values are computed from Carbon (Apache-2.0, notices in `THIRD_PARTY_NOTICES.md`), the fonts are IBM Plex (SIL Open Font License 1.1, `OFL.txt`).

### Verify a release

```sh
gh release download vX.Y.Z --repo pklnx/design-system
sha256sum -c SHA256SUMS            # or on macOS: shasum -a 256 -c SHA256SUMS
gh attestation verify pklnx-design-system-X.Y.Z.tgz --repo pklnx/design-system
```

Stricter, pinned to the release workflow and the tag:

```sh
gh attestation verify pklnx-design-system-X.Y.Z.tgz --repo pklnx/design-system \
  --signer-workflow pklnx/design-system/.github/workflows/release.yml \
  --source-ref refs/tags/vX.Y.Z
```

The integrity in the consumer's `pnpm-lock.yaml` must equal:

```sh
echo "sha512-$(openssl dgst -sha512 -binary pklnx-design-system-X.Y.Z.tgz | openssl base64 -A)"
```

The release notes print the install command and this integrity, too.

The release workflow checks that the tagged commit is on `main`. That check is a guard against mistakes, not a security boundary: a tag push runs the `release.yml` of the tagged commit itself, so a tag on a branch commit with a changed workflow would skip it, and the attestation's `--source-ref` names the tag, not the branch. When you update a consumer, also check that the release's commit is on `main`, for example `git merge-base --is-ancestor vX.Y.Z origin/main` in a clone of this repository.

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
2. Tag `vX.Y.Z` on that `main` commit and push the tag (`git tag vX.Y.Z <commit> && git push origin vX.Y.Z`).

`.github/workflows/release.yml` checks the tag format, that it equals `v` plus the `package.json` version and that the commit is on `main`, then builds with `--ignore-scripts`, runs the tests and the package check, packs the tarball, writes `SHA256SUMS` and the notes, attests the tarball and creates the release. A tag that fails a check fails the workflow before anything is published: delete the tag and tag again. A release that exists is never replaced.

## Layout

| Path | Contents |
| --- | --- |
| `theme/brand.json` | The brand decisions: primary hue (`purple`) and logo colors. **Change things here.** |
| `theme/pklnx-carbon.css`, `theme/_index.scss` | Generated: only the tokens that differ from Carbon |
| `theme/tokens.json` | Generated: every Carbon color token for White and G100 after the customization |
| `theme/contrast-report.json` | Generated: contrast check of the key pairs |
| `theme/logo-geometry.json` | Generated: paths of the wordmark and the mark |
| `src/` | Sources: Carbon component selection (`carbon.scss`), own styles (`pklnx.css`), React components (`components.jsx`) |
| `scripts/` | Build scripts; `check-pack.mjs` (package contents) and `release-notes.mjs` with their tests (`npm test`) |
| `project/` | Content of the claude.ai design system (README, tokens, components, previews, assets, fonts) |

## Building

```sh
npm install
pip install fonttools brotli
python3 scripts/build_logo.py      # logos from IBM Plex Mono
npm run build                      # tokens, theme, bundle.css, bundle.js
python3 scripts/build_assets.py    # pattern, social images (after the build, reads theme/tokens.json)
node scripts/build_icons.mjs       # Carbon icons as SVG
node scripts/render-previews.mjs   # every preview in both themes into .render/ (Chromium)
npm run site                       # documentation site into site/
```

## Documentation site

The same content as on claude.ai, as a static site on GitHub Pages: **https://pklnx.github.io/design-system/**

- `.github/workflows/pages.yml` builds it on every push to `main` (`npm ci`, `npm run build`, `npm run site`) and deploys it with GitHub Pages.
- Overview (brand book), colors, typography, spacing and size, assets, and one page per component with its live preview and guidelines. Theme switch between G100 and White.
- Repo and site are public.


## Publishing to claude.ai

The design system lives on claude.ai as the artifact "pklnx design system". Claude publishes it from this repo:

- Files under `project/` are uploaded as files, SVGs under `project/assets/` as asset uploads. Their IDs are in `project/design-system.json` (`assetGroups`).
- When an SVG changes, it has to be uploaded again and its ID replaced in the index.
- Edits made directly in the claude.ai editor do not land here automatically. Pull them back and commit them before the next build.

## License

- Code in this repo (theme, scripts, components, documentation): [MIT](LICENSE).
- Brand assets (name, wordmark, mark, pattern, social images): all rights reserved, see the exceptions in [LICENSE](LICENSE).
- Carbon (IBM, Apache-2.0), its dependencies (MIT, Apache-2.0) and IBM Plex (SIL Open Font License 1.1): see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), generated by `npm run build`. Carbon and IBM are trademarks of IBM; this project is not affiliated with or endorsed by IBM.
