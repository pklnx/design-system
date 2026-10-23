# ServiceCard

A service or project as a Carbon Tile: name, status, one sentence of description, host link at the bottom.

- Area `layer-01` on `background`, no shadows, no rounded corners. In a grid with a 2px gap (Carbon tile gutter) or `spacing-07`.
- Name in `heading-03`, description `body-01` in `text-secondary`, host as a Carbon Link in mono with the Launch icon.
- Show the status only when it is actually monitored (`StatusBadge`).
- The consumer provides `name`, optionally `host`, `href`, `status`, and the description as `children`.
