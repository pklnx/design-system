# StatusBadge

Status of a service as a Carbon Icon Indicator: its own shape per status, color from `support-*`, always a word.

- `ok` Running (green circle with check), `warn` Maintenance (yellow triangle), `err` Down (red octagon), `info` Notice (blue), `off` Off (dashed circle).
- Distinguishable without color: shape and word carry the meaning.
- Custom words through `children`, but short: "Running", "Maintenance until 6 pm".
- Show it only when the status is actually monitored.
- Built on `preview__IconIndicator` from `@carbon/react` 1.119. The API may still change in future Carbon versions.
