# Social

- `pklnx-og-image.svg`: 1200 × 630, Open Graph image for pklnx.space. Export as PNG.
- `pklnx-banner.svg`: 1280 × 320, header image for the GitHub profile README or LinkedIn.
- `mail-archive-social.svg`, `paperless-go-social.svg` (and `.png`): 1280 × 640, the products' social preview and Open Graph image: lockup, the repository description, and a small pklnx★space wordmark bottom left (`#c6c6c6`, star `#a56eff`). The SVGs come from `scripts/build_assets.py`, the PNGs from `scripts/render_pngs.mjs`. They are product assets, checked by `scripts/product-logos.test.mjs`, and intentionally **not indexed** in `project/design-system.json`: they are not uploaded to the claude.ai design system, so the Pages Assets page does not list them. `scripts/design-system-index.test.mjs` names them as the exclusion.

All on `#161616` with a dot grid in `#393939`, wordmark or lockup `#f4f4f4` with star `#a56eff`, tagline or description in IBM Plex Mono `#c6c6c6`, type as paths.
