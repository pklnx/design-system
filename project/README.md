pklnx.space is Patrick Klein's one-person business for infrastructure and cloud engineering. This system is **IBM Carbon (v11), unchanged in structure, typography and components, with exactly one brand decision: Purple instead of Blue as the interactive color**. On top of that comes the brand itself: the wordmark pklnx★space in the space bar, set in IBM Plex Mono.

Where this page says nothing, Carbon applies: carbondesignsystem.com. Carbon wins over ideas of our own.

## Brand

- The wordmark is **pklnx★space in the space bar**: `pklnx` in IBM Plex Mono Bold, the star as the dot, `space` in IBM Plex Mono Regular, the space bar bracket underneath. Eleven characters on the monospace grid.
- The mark is **the space bar with the star**. It stands alone where the wordmark does not fit: favicon, avatar, app icon, front of the business card.
- Always write the name in lowercase: `pklnx.space`, in running text also just `pklnx`. Never "PKLNX" or "Pklnx".
- The name is a coined brand and stays the same after Patrick's name change. Personal names appear only in sender lines, signatures and on the business card, and are swapped there.
- On the web use the `Logo` component, for files the SVGs in the **Logos** group. Clear space, minimum sizes and don'ts: card `LogoUsage`.

## Color

- Two Carbon themes: **G100 (dark)** is the default for web, social and screen. **White (paper)** is for print, invoices, letters and light pages. In code they are `cds--g100` and `cds--white`.
- Every color token is a Carbon token with Carbon's name and value. Only the tokens that carry Blue 60 in Carbon are changed: `button-primary`, `button-tertiary`, `interactive`, `focus` (light), `border-interactive`, `link-primary`, `link-secondary`, `icon-interactive`, `highlight`, `background-brand` and their hover and active steps. They now carry the same step of Purple: buttons Purple 60 `#8a3ffc` in both themes, links and interactive elements Purple 60 in light, Purple 40 to 50 in dark.
- Visited links (`link-visited`) go Blue, because Purple is already the link color.
- **`button-primary` at most once per view.** Purple is the color for actions and links, not for decoration. One large Purple area (`background-brand`) at most once per page.
- `star` is the star in the logo and the `$` in the prompt: Purple 60 light, Purple 50 dark. Never a control.
- Surfaces: `background` for the page, `layer-01` for tiles, `layer-02` for elements on them. Text `text-primary`, secondary text `text-secondary`, helper text `text-helper`.
- Status stays Carbon: `support-success` green, `support-warning` yellow, `support-error` red, `support-info` blue. Always with icon and word (component `StatusBadge`). `support-caution-undefined` is Purple in Carbon and clashes with the brand: do not use it.
- Every text token holds 4.5:1 on its grounds in both themes, focus, borders and icons 3:1. The exceptions are Carbon's own: `text-disabled` on purpose, `support-warning` (yellow) on white only as an area or as an icon with a dark outline.

## Typography

- **IBM Plex** only: `font-sans` (IBM Plex Sans) for everything, `font-mono` (IBM Plex Mono) for code, host names, commands, numbers in tables and the brand. The font files are in `fonts/`, on the web from `@ibm/plex-sans` and `@ibm/plex-mono`.
- Carbon's productive type scale, unchanged: page titles `heading-05`, sections `heading-04`, tiles `heading-03`, body copy `body-02` on the web and `body-01` in dense areas, UI text `body-compact-01`, labels `label-01`, helper text `helper-text-01`, small print `legal-01`, code `code-01` and `code-02`.
- The one style of our own: `prompt` (Plex Mono SemiBold 28px) for section headings as a shell prompt (`$ ls ./services`), used sparingly.
- Sentence case everywhere. No all caps in labels, buttons or table headers.
- Body copy at most 68 characters wide, left aligned, never justified. Numbers in columns with `font-variant-numeric: tabular-nums`. In print body copy 10 pt, small print not below 7 pt.

## Spacing, shape, grid

- Carbon's spacing `spacing-01` (2px) to `spacing-13` (160px). Tile padding `spacing-05`, 2px gutter between tiles or `spacing-07`, sections `spacing-10` on mobile and `spacing-11` on desktop.
- Carbon 2x Grid: 16 columns from 1056px, 8 down to 640px, 4 below. Page margin `spacing-05`.
- Control heights from `size-*`. On the web buttons and fields are `size-lg` (48px), which is also the minimum touch target.
- **Square.** `radius-none` for everything. `radius-icon` only for the favicon and app icon tile, `radius-full` only for the avatar and status dot.
- No shadows, except Carbon's own `shadow` for floating menus. Depth comes from `layer` steps and 1px lines in `border-subtle`.
- Focus as in Carbon: 2px `focus` inside, white in dark, Purple in light.

## Voice and tone

- Direct, factual, short. All copy is in English. First person on the website ("I run …"), plain "you" towards clients.
- Buttons name the action as a verb: "Send request", "Copy code". Errors say what to do: "Enter the full address, for example info@company.com."
- The shell as a stylistic device, sparingly: section headings as a `Prompt` (`$ ls ./services`, `$ cat ./contact`), normal language everywhere else.
- Technical names exactly: host names, commands and paths in mono, spelled as they really are.
- No emoji, no exclamation marks, no marketing superlatives.

## Iconography

- **Carbon Icons** (`@carbon/icons-react`), through the `Icon` component with short names. 16px next to text (`icon-size-01`), 20px on their own (`icon-size-02`), color `currentColor`.
- The only drawing of our own is the star, filled in `star`, for emphasis only.
- Add missing icons from the Carbon library. No other icon sets, no emoji.

## Pattern

- Tile pattern of space bars and stars in the **Patterns** group, 96px tile, lines `border-subtle-00`.
- Only behind little content: banners, front of the business card, empty states. Never behind body copy.

## Components

- Web: `SiteHeader` (Carbon UI Shell Header), `Button`, `TextField` (Text Input, Text Area), `CodeBlock` (Code Snippet), `ServiceCard` (Tile), `StatusBadge` (Icon Indicator), `Icon`, plus the brand parts `Logo` and `Prompt`. React 18, global `window.Pklnx`, styles in `components/bundle.css`. Use any other Carbon component straight from `@carbon/react`; it picks up the theme automatically.
- Stationery in the White theme: `Letterhead`, `Invoice`, `BusinessCard`, `EmailSignature`. Placeholders are in square brackets.
- Social: `SocialKit` with Open Graph image, avatar and banner.

## In code

- Source: github.com/pklnx/design-system. Load `theme/pklnx-carbon.css` after Carbon's CSS and set `cds--g100` or `cds--white` on `<html>`. For Sass there is `theme/_index.scss` with `$g100`, `$white` and the override mixins.
- Never hard-code values in components, always use Carbon tokens (`var(--cds-…)`).
