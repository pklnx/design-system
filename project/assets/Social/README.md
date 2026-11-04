# Social

- `pklnx-og-image.svg`: 1200 × 630, Open Graph image for pklnx.space. Export as PNG.
- `pklnx-banner.svg`: 1280 × 320, header image for the GitHub profile README or LinkedIn.
- `mail-archive-social.svg`, `paperless-go-social.svg` (and `.png`): 1280 × 640, the products' social preview and Open Graph image: lockup, the repository description, and a small pklnx★space wordmark bottom left (`text-secondary`, token `star` of G100). The SVGs come from `scripts/build_assets.py`, the PNGs from `scripts/render_pngs.mjs`. They are product assets, checked by `scripts/product-logos.test.mjs`, and indexed in `project/design-system.json` and uploaded to the claude.ai design system like the pklnx images, SVG and PNG.

All on the G100 `background` with a dot grid in `border-subtle-00`, wordmark or lockup in `text-primary` with the G100 `star`, tagline or description in IBM Plex Mono `text-secondary`, type as paths. The values are the G100 tokens in `theme/tokens.json`.
