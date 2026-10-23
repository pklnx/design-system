# StatusBadge

Status of a service as a Carbon Icon Indicator: its own shape per status, color from `support-*`, always a word.

- `ok` „läuft“ (green circle with check), `warn` „Wartung“ (yellow triangle), `err` „gestört“ (red octagon), `info` „Hinweis“ (blue), `off` „aus“ (dashed circle).
- Distinguishable without color: shape and word carry the meaning.
- Custom words through `children`, German and short: „läuft“, „Wartung bis 18 Uhr“.
- Show it only when the status is actually monitored.
- Built on `preview__IconIndicator` from `@carbon/react` 1.119. The API may still change in future Carbon versions.
