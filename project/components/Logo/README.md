# Logo

Die Marke als Inline-SVG: `wordmark` (pklnx, Stern, space in der Leertaste) oder `mark` (Leertaste mit Stern).

- Die Wortmarke ist in IBM Plex Mono gesetzt (`pklnx` Bold, `space` Regular) und in Pfade umgewandelt. Elf Zeichen auf dem Monospace-Raster, der Stern sitzt in der Zelle der Leertaste.
- Text und Klammer folgen CSS `color` (Standard `text-primary`). Der Stern ist immer `star`, außer mit `mono`.
- Höhe in px über `height`. Wortmarke mindestens 20px hoch, Bildmarke mindestens 16px.
- Schutzraum rundum: die Höhe des Sterns, etwa 0.3 × Höhe der Wortmarke.
- Für Dateien (E-Mail, Druck, Social) die SVGs aus der Gruppe Logos nehmen, nicht das Inline-SVG.
- Der Konsument liefert nur Höhe und, wenn nötig, `title` für Screenreader.
