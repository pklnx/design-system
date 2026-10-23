// The VitePress theme (theme/vitepress.css): which pklnx Carbon token each VitePress
// variable gets, which colour pairs VitePress renders with them, and which VitePress
// rules for corners, focus and fonts are overridden or kept. scripts/build.mjs writes
// theme/vitepress.css from it; scripts/vitepress-theme.test.mjs checks the file against
// it, against theme/tokens.json and against the captured VitePress fixture.
//
// Written for the VitePress version the products pin (VITEPRESS_VERSION); the fixture
// scripts/fixtures/vitepress-<version>.json is captured from that version's tarball by
// scripts/capture-vitepress-fixture.mjs.

export const VITEPRESS_VERSION = '2.0.0-alpha.20';

// ---------------------------------------------------------------- colours
// VitePress variable → Carbon token in tokens.json, per theme. 'transparent' is literal.
const T = (light, dark = light) => ({ light, dark });
const FAMILIES = ['tip', 'note', 'important', 'warning', 'caution', 'danger', 'success'];
const BLOCKS = {
  info: 'notification-background-info',
  note: 'notification-background-info',
  important: 'notification-background-info',
  tip: 'notification-background-success',
  warning: 'notification-background-warning',
  caution: 'notification-background-warning',
  danger: 'notification-background-error',
  details: 'layer-01',
};
const BADGES = {
  info: ['tag-background-gray', 'tag-color-gray'],
  note: ['tag-background-gray', 'tag-color-gray'],
  tip: ['tag-background-green', 'tag-color-green'],
  // Purple stays for actions and links.
  important: ['tag-background-blue', 'tag-color-blue'],
  // Yellow only as an area with dark text (#161616 in both themes).
  warning: ['support-warning', T('text-primary', 'text-inverse')],
  caution: ['support-warning', T('text-primary', 'text-inverse')],
  danger: ['tag-background-red', 'tag-color-red'],
};
const BUTTONS = {
  brand: ['button-primary', 'button-primary-hover', 'button-primary-active'],
  alt: ['button-secondary', 'button-secondary-hover', 'button-secondary-active'],
};

export const MAP = {
  '--vp-c-bg': T('background'),
  '--vp-c-bg-alt': T('layer-01'),
  '--vp-c-bg-soft': T('layer-01'),
  // Menus and flyouts. Light stays white so the menu hover (default-soft) is visible.
  '--vp-c-bg-elv': T('background', 'layer-01'),
  '--vp-c-text-1': T('text-primary'),
  '--vp-c-text-2': T('text-secondary'),
  '--vp-c-text-3': T('text-helper'),
  '--vp-c-border': T('border-strong-01'),
  '--vp-c-divider': T('border-subtle-00'),
  '--vp-c-gutter': T('border-subtle-00'),
  '--vp-c-default-1': T('layer-active-01'),
  '--vp-c-default-2': T('layer-accent-01'),
  '--vp-c-default-3': T('layer-hover-01'),
  // Menu-link hover and the feature icon ground; code grounds are set separately.
  '--vp-c-default-soft': T('layer-01', 'layer-hover-01'),
  '--vp-c-brand-1': T('link-primary'),
  '--vp-c-brand-2': T('link-primary-hover'),
  '--vp-c-brand-3': T('button-primary'),
  '--vp-c-brand-soft': T('highlight'),
  // Links and code in links inside every block stay link colours; the semantic colour
  // sits in the block ground and the badge.
  ...Object.fromEntries(FAMILIES.flatMap((f) => [
    [`--vp-c-${f}-1`, T('link-primary')],
    [`--vp-c-${f}-2`, T('link-primary-hover')],
    [`--vp-c-${f}-3`, T('button-primary')],
  ])),
  '--vp-c-tip-soft': T('notification-background-success'),
  '--vp-c-note-soft': T('notification-background-info'),
  '--vp-c-important-soft': T('notification-background-info'),
  '--vp-c-warning-soft': T('notification-background-warning'),
  '--vp-c-caution-soft': T('notification-background-warning'),
  '--vp-c-danger-soft': T('notification-background-error'),
  '--vp-c-success-soft': T('notification-background-success'),
  ...Object.fromEntries(Object.entries(BUTTONS).flatMap(([kind, [bg, hover, active]]) => [
    [`--vp-button-${kind}-border`, T(bg)],
    [`--vp-button-${kind}-text`, T('text-on-color')],
    [`--vp-button-${kind}-bg`, T(bg)],
    [`--vp-button-${kind}-hover-border`, T(hover)],
    [`--vp-button-${kind}-hover-text`, T('text-on-color')],
    [`--vp-button-${kind}-hover-bg`, T(hover)],
    [`--vp-button-${kind}-active-border`, T(active)],
    [`--vp-button-${kind}-active-text`, T('text-on-color')],
    [`--vp-button-${kind}-active-bg`, T(active)],
  ])),
  ...Object.fromEntries(Object.entries(BADGES).flatMap(([kind, [bg, text]]) => [
    [`--vp-badge-${kind}-border`, T('transparent')],
    [`--vp-badge-${kind}-text`, typeof text === 'string' ? T(text) : text],
    [`--vp-badge-${kind}-bg`, T(bg)],
  ])),
  ...Object.fromEntries(Object.entries(BLOCKS).flatMap(([kind, bg]) => [
    [`--vp-custom-block-${kind}-border`, T('transparent')],
    [`--vp-custom-block-${kind}-text`, T('text-primary')],
    [`--vp-custom-block-${kind}-bg`, T(bg)],
    // Inline code in blocks: a grey ground would fail 4.5:1 under link colours in light.
    [`--vp-custom-block-${kind}-code-bg`, T('background')],
  ])),
  // Carbon code-01; Purple is not used for decoration.
  '--vp-code-color': T('text-primary'),
  '--vp-code-bg': T('layer-01'),
  '--vp-code-link-color': T('link-primary'),
  '--vp-code-link-hover-color': T('link-primary-hover'),
  '--vp-code-block-color': T('text-primary'),
  '--vp-code-block-bg': T('layer-01'),
  '--vp-code-block-divider-color': T('border-subtle-00'),
  '--vp-code-lang-color': T('text-helper'),
  '--vp-code-line-number-color': T('text-helper'),
  '--vp-code-tab-divider': T('border-subtle-00'),
  '--vp-code-tab-text-color': T('text-secondary'),
  '--vp-code-tab-bg': T('layer-01'),
  '--vp-code-tab-hover-text-color': T('text-primary'),
  '--vp-code-tab-active-text-color': T('text-primary'),
  '--vp-code-tab-active-bar-color': T('border-interactive'),
  '--vp-code-copy-code-border-color': T('border-subtle-00'),
  '--vp-code-copy-code-bg': T('layer-01'),
  '--vp-code-copy-code-hover-border-color': T('border-strong-01'),
  '--vp-code-copy-code-hover-bg': T('layer-hover-01'),
  '--vp-code-copy-code-active-text': T('text-primary'),
  '--vp-local-search-bg': T('background'),
  '--vp-local-search-result-bg': T('layer-01'),
  '--vp-local-search-result-border': T('border-subtle-00'),
  '--vp-local-search-result-selected-bg': T('layer-01'),
  // The selected search result shows focus through this border (VPLocalSearchBox
  // keeps `.result { outline: none }`).
  '--vp-local-search-result-selected-border': T('border-interactive'),
  '--vp-local-search-highlight-bg': T('highlight'),
  '--vp-local-search-highlight-text': T('text-primary'),
  '--vp-nav-bg-color': T('background'),
  '--vp-nav-screen-bg-color': T('background'),
  '--vp-local-nav-bg-color': T('background'),
  '--vp-sidebar-bg-color': T('layer-01'),
  '--vp-home-hero-name-color': T('text-primary'),
  '--vp-input-border-color': T('border-strong-01'),
  '--vp-input-switch-bg-color': T('layer-01'),
  // Focus colours for the rules below (Carbon's focus and the inner ring of its
  // button focus).
  '--pklnx-vp-focus': T('focus'),
  '--pklnx-vp-focus-inset': T('focus-inset'),
};

// Custom properties that are not colours, the same in both themes. The font stacks are
// Carbon's (@carbon/type), passed in by the build.
export const staticProperties = (fonts) => ({
  '--vp-font-family-base': fonts.sans,
  '--vp-font-family-mono': fonts.mono,
  // No glow behind the hero image.
  '--vp-home-hero-image-background-image': 'none',
});

// ---------------------------------------------------------------- contrast
// Every foreground/background pair VitePress renders with the mapped variables, checked
// in both themes. min: 4.5 for text, 3 for non-text; the menu hover only has to be
// visibly different from the menu ground.
const B = (k) => `--vp-custom-block-${k}`;
const BLOCK_FAMILY = { info: 'brand', note: 'brand', details: 'brand', tip: 'tip', important: 'important', warning: 'warning', caution: 'caution', danger: 'danger' };
const PAGE = ['--vp-c-bg', '--vp-c-bg-alt', '--vp-c-bg-soft', '--vp-c-bg-elv'];
export const PAIRS = [
  { fg: '--vp-c-text-1', on: [...PAGE, '--vp-c-default-soft', '--vp-nav-bg-color', '--vp-sidebar-bg-color', '--vp-local-search-bg', '--vp-local-search-result-bg'], min: 4.5, where: 'text' },
  { fg: '--vp-c-text-2', on: [...PAGE, '--vp-sidebar-bg-color', '--vp-local-search-result-bg'], min: 4.5, where: 'secondary text' },
  { fg: '--vp-c-text-3', on: PAGE, min: 4.5, where: 'helper text' },
  { fg: '--vp-c-brand-1', on: [...PAGE, '--vp-c-default-soft', '--vp-sidebar-bg-color', '--vp-local-search-result-bg'], min: 4.5, where: 'links, active nav and menu link' },
  { fg: '--vp-c-brand-2', on: ['--vp-c-bg', '--vp-c-bg-alt', '--vp-c-bg-soft'], min: 4.5, where: 'link hover' },
  { fg: '--vp-home-hero-name-color', on: ['--vp-c-bg'], min: 4.5, where: 'hero name' },
  { fg: '--vp-c-default-soft', on: ['--vp-c-bg-elv'], min: 1.05, where: 'menu hover is visible' },
  ...['brand', 'brand-hover', 'brand-active', 'alt', 'alt-hover', 'alt-active'].map((b) => ({ fg: `--vp-button-${b}-text`, on: [`--vp-button-${b}-bg`], min: 4.5, where: `${b} button` })),
  ...Object.keys(BADGES).map((k) => ({ fg: `--vp-badge-${k}-text`, on: [`--vp-badge-${k}-bg`], min: 4.5, where: `${k} badge` })),
  ...Object.entries(BLOCK_FAMILY).flatMap(([k, fam]) => [
    { fg: `${B(k)}-text`, on: [`${B(k)}-bg`], min: 4.5, where: `${k} block text` },
    { fg: `--vp-c-${fam}-1`, on: [`${B(k)}-bg`, `${B(k)}-code-bg`], min: 4.5, where: `${k} block link, code in link` },
    { fg: `--vp-c-${fam}-2`, on: [`${B(k)}-bg`, `${B(k)}-code-bg`], min: 4.5, where: `${k} block link hover` },
    { fg: '--vp-code-color', on: [`${B(k)}-code-bg`], min: 4.5, where: `${k} block inline code` },
  ]),
  { fg: '--vp-code-color', on: ['--vp-code-bg'], min: 4.5, where: 'inline code' },
  { fg: '--vp-code-link-color', on: ['--vp-code-bg'], min: 4.5, where: 'code in a link' },
  { fg: '--vp-code-link-hover-color', on: ['--vp-code-bg'], min: 4.5, where: 'code in a link, hover' },
  { fg: '--vp-code-block-color', on: ['--vp-code-block-bg'], min: 4.5, where: 'code block' },
  { fg: '--vp-code-line-number-color', on: ['--vp-code-block-bg'], min: 4.5, where: 'line numbers' },
  { fg: '--vp-code-lang-color', on: ['--vp-code-block-bg'], min: 4.5, where: 'language label' },
  { fg: '--vp-code-tab-text-color', on: ['--vp-code-tab-bg'], min: 4.5, where: 'code-group tab' },
  { fg: '--vp-code-tab-hover-text-color', on: ['--vp-code-tab-bg'], min: 4.5, where: 'code-group tab, hover' },
  { fg: '--vp-code-tab-active-text-color', on: ['--vp-code-tab-bg'], min: 4.5, where: 'code-group tab, active' },
  { fg: '--vp-code-tab-active-bar-color', on: ['--vp-code-tab-bg'], min: 3, where: 'code-group active bar' },
  { fg: '--vp-code-copy-code-active-text', on: ['--vp-code-copy-code-hover-bg'], min: 4.5, where: 'copied label' },
  { fg: '--vp-local-search-highlight-text', on: ['--vp-local-search-highlight-bg'], min: 4.5, where: 'search match' },
  { fg: '--vp-local-search-result-selected-border', on: ['--vp-local-search-result-bg', '--vp-local-search-bg'], min: 3, where: 'selected search result border' },
  { fg: '--pklnx-vp-focus', on: [...PAGE, '--vp-nav-bg-color', '--vp-sidebar-bg-color', '--vp-local-search-bg', '--vp-local-search-result-bg', '--vp-code-block-bg'], min: 3, where: 'focus ring' },
  { fg: '--pklnx-vp-focus', on: ['--pklnx-vp-focus-inset'], min: 3, where: 'the two rings of the button focus' },
];

// Carbon's button focus is a double ring: for each button state, the better of the two
// rings must reach 3:1 against the button.
export const RING_GROUNDS = ['brand', 'brand-hover', 'brand-active', 'alt', 'alt-hover', 'alt-active'].map((b) => `--vp-button-${b}-bg`);
export const RINGS = ['--pklnx-vp-focus', '--pklnx-vp-focus-inset'];

// ---------------------------------------------------------------- fonts
// URLs are relative to theme/vitepress.css; Vite resolves them on the file system.
export const FONT_FACES = [
  { family: 'IBM Plex Sans', file: 'IBMPlexSans-Light.woff2', weight: '300', style: 'normal' },
  { family: 'IBM Plex Sans', file: 'IBMPlexSans-Regular.woff2', weight: '400', style: 'normal' },
  { family: 'IBM Plex Sans', file: 'IBMPlexSans-Italic.woff2', weight: '400', style: 'italic' },
  // Declared for 600 and 700, so VitePress's bold does not get a synthesized face.
  { family: 'IBM Plex Sans', file: 'IBMPlexSans-SemiBold.woff2', weight: '600 700', style: 'normal' },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono-Regular.woff2', weight: '400', style: 'normal' },
  { family: 'IBM Plex Mono', file: 'IBMPlexMono-SemiBold.woff2', weight: '600 700', style: 'normal' },
];
export const FONT_DIR = '../project/fonts/';

// ---------------------------------------------------------------- overridden rules
// Every rule here covers the listed VitePress rules (file under
// dist/client/theme-default/, selector as written there). The tests check that each
// covered rule exists in the fixture, that one selector of the override targets the
// same element (its subject compound has every class of the VitePress subject and
// matches every element that subject matches) and that the override wins.
const at = (file, ...selectors) => selectors.map((selector) => ({ file, selector }));
const LANG = "div[class*='language-']";
const COPY = ".vp-doc [class*='language-'] > button.copy";

// Carbon is square. Every corner rule is `border-radius: 0 !important`: an unlayered
// !important declaration beats every normal declaration whatever its specificity, Vue
// scoping or load order (the async VPLocalSearchBox chunk loads after this file).
// Where VitePress itself uses !important, the selector is strictly more specific.
export const CORNERS = [
  { area: 'Buttons', selectors: ['.VPButton.medium', '.VPButton.big'], covers: at('components/VPButton.vue', '.VPButton.medium', '.VPButton.big') },
  { area: 'Badges', selectors: ['.VPBadge'], covers: at('components/VPBadge.vue', '.VPBadge') },
  { area: 'Custom blocks', selectors: ['.custom-block'], covers: at('styles/components/custom-block.css', '.custom-block') },
  { area: 'Custom blocks', selectors: [`.vp-doc .custom-block ${LANG}`, '.vp-doc .custom-block .vp-code-group .tabs'], covers: at('styles/components/vp-doc.css', `.vp-doc .custom-block ${LANG}`, '.vp-doc .custom-block .vp-code-group .tabs') },
  { area: 'Code', selectors: [`.vp-doc ${LANG}`, '.vp-block', `.vp-doc li ${LANG}`, '.vp-doc :not(pre) > code'], covers: at('styles/components/vp-doc.css', `.vp-doc ${LANG}`, '.vp-block', `.vp-doc li ${LANG}`, '.vp-doc :not(pre) > code') },
  { area: 'Code', selectors: [COPY, `${COPY}.copied`, `${COPY}.copied::before`], covers: at('styles/components/vp-doc.css', COPY, `${COPY}.copied`, `${COPY}:hover.copied`, `${COPY}.copied::before`, `${COPY}:hover.copied::before`) },
  { area: 'Code-group tabs', selectors: ['.vp-code-group .tabs', '.vp-code-group .tabs label::after'], covers: at('styles/components/vp-code-group.css', '.vp-code-group .tabs', '.vp-code-group .tabs label::after') },
  { area: 'Feature cards', selectors: ['.VPFeature', '.VPFeature .icon'], covers: at('components/VPFeature.vue', '.VPFeature', '.icon') },
  { area: 'Menus', selectors: ['.VPMenu'], covers: at('components/VPMenu.vue', '.VPMenu') },
  { area: 'Menus', selectors: ['.VPMenuLink .link'], covers: at('components/VPMenuLink.vue', '.link') },
  { area: 'Menus', selectors: ['.VPLocalNavOutlineDropdown .items'], covers: at('components/VPLocalNavOutlineDropdown.vue', '.items') },
  { area: 'Search', selectors: ['.VPNavBarSearchButton', '.VPNavBarSearchButton .keys'], covers: at('components/VPNavBarSearchButton.vue', '.VPNavBarSearchButton', '.keys') },
  {
    area: 'Search',
    selectors: ['.VPLocalSearchBox .shell', '.VPLocalSearchBox .search-bar', '.VPLocalSearchBox .result', '.VPLocalSearchBox .search-keyboard-shortcuts kbd', '.VPLocalSearchBox .titles mark', '.VPLocalSearchBox .excerpt mark'],
    covers: at('components/VPLocalSearchBox.vue', '.shell', '.search-bar', '.result', '.search-keyboard-shortcuts kbd', '.titles :deep(mark)', '.excerpt :deep(mark)'),
  },
  // VitePress: `.excerpt[data-v] .vp-code-group div[class*='language-']` (0,4,1) !important.
  { area: 'Search', selectors: [`.VPLocalSearchBox .excerpt.excerpt .vp-code-group ${LANG}`], covers: at('components/VPLocalSearchBox.vue', `.excerpt :deep(.vp-code-group) ${LANG}`) },
  { area: 'Other', selectors: ['.VPDocFooter .pager-link'], covers: at('components/VPDocFooter.vue', '.pager-link') },
  { area: 'Other', selectors: ['.VPNavScreenAppearance'], covers: at('components/VPNavAppearance.vue', '.VPNavScreenAppearance') },
  { area: 'Other', selectors: ['.VPSkipLink'], covers: at('components/VPSkipLink.vue', '.VPSkipLink') },
  { area: 'Other', selectors: ['.VPTeamMembersItem'], covers: at('components/VPTeamMembersItem.vue', '.VPTeamMembersItem') },
];

// Focus, nav title and inline code: normal declarations, unlayered. VitePress's
// base.css sits in @layer __vitepress_base, so these beat its rules at any
// specificity. `elements` describe the elements a rule is meant for; the tests check
// that the rule matches them and that every VitePress rule which sets the same
// property on them either loses or is kept below with a reason.
const RING = 'outline: 2px solid var(--pklnx-vp-focus)';
export const RULES = [
  {
    area: 'Focus',
    note: 'Text links: a ring outside the text, so it never covers the glyphs.',
    selector: 'a:focus-visible',
    decls: [RING, 'outline-offset: 2px'],
    elements: [{ tag: 'a', attrs: { href: '/' } }],
  },
  {
    area: 'Focus',
    note: 'Controls: an inset ring, as on Carbon fields and icon buttons. Inside :where(), so every component rule outranks it; elements with tabindex="-1" are programmatic focus targets (the sidebar nav, headings after anchor navigation) and get no ring.',
    selector: ':where(button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])):focus-visible',
    decls: [RING, 'outline-offset: -2px'],
    covers: at('styles/base.css', 'button:focus', 'input:focus', 'textarea:focus', 'select:focus', 'button:focus-visible'),
    elements: [{ tag: 'button' }, { tag: 'input' }, { tag: 'select' }, { tag: 'textarea' }, { tag: 'summary' }, { tag: 'div', attrs: { tabindex: '0' } }],
  },
  {
    area: 'Focus',
    note: "Buttons: Carbon's button focus, a 2 px ring in focus with a 1 px inner ring in focus-inset (white on Purple 60 in light).",
    selector: '.VPButton:focus-visible',
    decls: ['outline: none', 'box-shadow: inset 0 0 0 2px var(--pklnx-vp-focus), inset 0 0 0 3px var(--pklnx-vp-focus-inset)'],
    elements: [{ tag: 'a', classes: ['VPButton', 'medium', 'brand'], attrs: { href: '/' } }, { tag: 'button', classes: ['VPButton', 'big', 'alt'] }],
  },
  {
    area: 'Font',
    note: 'Nav title: IBM Plex Mono (VitePress sets weight 600), so it renders the lockup as live text.',
    selector: '.VPNavBarTitle .title',
    decls: ['font-family: var(--vp-font-family-mono)'],
    elements: [{ tag: 'a', classes: ['title'], attrs: { href: '/' } }],
  },
  {
    area: 'Code',
    note: "Inline code in custom blocks: keeps the code colour instead of the block's link colour; code inside links keeps the link colour. (0,2,2) beats `.custom-block.<kind> code` (0,2,1).",
    selector: '.vp-doc .custom-block :not(a) > code',
    decls: ['color: var(--vp-code-color)'],
    elements: [{ tag: 'code' }],
  },
];

// ---------------------------------------------------------------- kept rules
// VitePress rules that set a corner, an outline or a font and stay as they are (file,
// selector, the property kept, the reason). An
// outline rule that is not in a cascade layer carries the element it styles: the tests
// check that it still wins against every pklnx focus rule that matches that element.
const keep = (file, selectors, property, reason, element) => selectors.map((selector) => ({ file, selector, property, reason, ...(element ? { element: element(selector) } : {}) }));
const UNUSED = 'component the products do not use';
export const KEPT = [
  ...keep('components/VPSwitch.vue', ['.VPSwitch', '.check', '.icon'], 'border-radius', "the appearance toggle; Carbon's toggle is round too"),
  ...keep('components/VPLocalSearchBox.vue', ['.search-loading'], 'border-radius', 'a spinner'),
  ...keep('components/VPHero.vue', ['.image-bg'], 'border-radius', 'hidden by --vp-home-hero-image-background-image: none'),
  ...keep('components/VPDocAsideOutline.vue', ['.outline-marker'], 'border-radius', 'a 2 px bar'),
  ...keep('components/VPSidebarItem.vue', ['.indicator'], 'border-radius', 'a 2 px bar'),
  ...keep('components/VPTeamMembersItem.vue', ['.avatar', '.avatar-img'], 'border-radius', 'avatar circle (radius-full)'),
  ...keep('components/VPCarbonAds.vue', ['.VPCarbonAds', '.VPCarbonAds :deep(img)'], 'border-radius', UNUSED),
  ...keep('components/VPNavBarAskAiButton.vue', ['.VPNavBarAskAiButton'], 'border-radius', `${UNUSED} (Algolia)`),
  ...keep('styles/components/vp-sponsor.css', ['.vp-sponsor', '.vp-sponsor.aside'], 'border-radius', UNUSED),
  ...keep('styles/docsearch.css', ['.DocSearch-Commands-Key', '.DocSearch-Menu-content', '.DocSearch-Menu-item'], 'border-radius', `${UNUSED} (Algolia)`),
  ...keep('styles/docsearch.css', ['.DocSearch-Hit a:focus-visible'], 'outline', `${UNUSED} (Algolia); sets its own ring`, () => ({ tag: 'a', attrs: { href: '/' } })),
  ...keep('components/VPLocalSearchBox.vue', ['.result'], 'outline', 'the selected result shows focus through --vp-local-search-result-selected-border (border-interactive)', () => ({ tag: 'a', classes: ['result', 'selected'], attrs: { href: '/' } })),
  ...keep('components/VPSidebar.vue', ['.nav'], 'outline', 'a programmatic skip-link target (tabindex="-1")', () => ({ tag: 'nav', classes: ['nav'], attrs: { id: 'VPSidebarNav', tabindex: '-1' } })),
  ...keep('styles/components/vp-doc.css', ['.vp-doc h1', '.vp-doc h2', '.vp-doc h3', '.vp-doc h4', '.vp-doc h5', '.vp-doc h6'], 'outline', 'headings focused by anchor navigation (the router sets tabindex="-1")', (s) => ({ tag: s.slice(-2), attrs: { id: 'x', tabindex: '-1' } })),
  ...keep('components/VPTeamMembersItem.vue', ['.sp .sp-link.link:hover', '.sp .sp-link.link:focus'], 'outline', UNUSED, () => ({ tag: 'a', classes: ['sp-link', 'link'], attrs: { href: '/' } })),
  ...keep('styles/base.css', [':-moz-focusring:where(:not(iframe))'], 'outline', "Firefox's default ring in @layer __vitepress_base; every pklnx focus rule is unlayered and replaces it where it applies"),
  ...keep('components/VPNavBarSearchButton.vue', ['kbd'], 'font-family', "inherits the search button's font"),
];

// Values that already equal what the overrides set, so their rules need no entry.
export const isTargetValue = (property, value) =>
  (property === 'border-radius' && /^0(px|rem|%)?$/.test(value.trim()))
  || (property === 'font-family' && /^var\(--vp-font-family-(base|mono)\)$/.test(value.trim()));

// ---------------------------------------------------------------- the stylesheet
const block = (selector, props) => `${selector} {\n${Object.entries(props).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;

// Resolves MAP for one theme against tokens.json.
export function themeValues(tokens, theme) {
  return Object.fromEntries(Object.entries(MAP).map(([name, t]) => {
    const token = t[theme];
    if (token === 'transparent') return [name, 'transparent'];
    const v = tokens[theme][token];
    if (!v) throw new Error(`vitepress-map: token ${token} missing in ${theme}`);
    return [name, v];
  }));
}

// The text of theme/vitepress.css. tokens: theme/tokens.json; fonts: { sans, mono }.
export function vitepressCss(tokens, fonts) {
  const statics = staticProperties(fonts);
  let css = `/* pklnx VitePress theme: VitePress ${VITEPRESS_VERSION} default theme with the pklnx Carbon tokens,
   IBM Plex, Carbon corners and focus. Import after vitepress/theme-without-fonts.
   Generated by scripts/build.mjs from theme/tokens.json and scripts/vitepress-map.mjs. Do not edit. */
`;
  css += block(':root', { ...themeValues(tokens, 'light'), ...statics });
  css += block('.dark', { ...themeValues(tokens, 'dark'), ...statics });
  for (const f of FONT_FACES) {
    css += block('@font-face', {
      'font-family': `"${f.family}"`,
      src: `url("${FONT_DIR}${f.file}") format("woff2")`,
      'font-weight': f.weight,
      'font-style': f.style,
      'font-display': 'swap',
    });
  }
  css += '/* Corners: Carbon is square. */\n';
  for (const c of CORNERS) css += `${c.selectors.join(',\n')} {\n  border-radius: 0 !important;\n}\n`;
  for (const r of RULES) css += `/* ${r.note.replace(/\*\//g, '* /')} */\n${r.selector} {\n${r.decls.map((d) => `  ${d};`).join('\n')}\n}\n`;
  return css;
}
