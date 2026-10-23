# SiteHeader

Page header as a Carbon UI Shell Header: wordmark on the left, navigation next to it, "Skip to main content" for keyboard users.

- 48px high, area `background`, divider `border-subtle`. The current page gets `current` and Carbon's marker in `border-interactive` (Purple).
- At most five links. On narrow screens Carbon hides the navigation; add a menu through `HeaderMenuButton` for mobile if needed.
- In the flow by default. With `fixed` it sticks to the top, as usual in Carbon; the content then needs 48px top spacing.
- The consumer provides `links` (`label`, `href`, `current`) and the `contentId` of the main content (default `main`).
