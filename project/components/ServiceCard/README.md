# ServiceCard

Ein Dienst oder Projekt als Carbon Tile: Name, Status, ein Satz Beschreibung, Host-Link unten.

- Fläche `layer-01` auf `background`, keine Schatten, keine runden Ecken. Im Raster 2px Abstand (Carbon-Kachelfuge) oder `spacing-07`.
- Name in `heading-03`, Beschreibung `body-01` in `text-secondary`, Host als Carbon Link in Mono mit Launch-Icon.
- Status nur zeigen, wenn er tatsächlich überwacht wird (`StatusBadge`).
- Der Konsument liefert `name`, optional `host`, `href`, `status` und die Beschreibung als `children`.
