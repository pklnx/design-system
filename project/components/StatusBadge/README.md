# StatusBadge

Status eines Dienstes als Carbon Icon Indicator: eigene Form je Status, Farbe aus `support-*` und immer ein Wort.

- `ok` läuft (grüner Kreis mit Haken), `warn` Wartung (gelbes Dreieck), `err` gestört (rotes Achteck), `info` Hinweis (blau), `off` aus (gestrichelter Kreis).
- Unterscheidbar ohne Farbe: Form und Wort tragen die Bedeutung.
- Eigene Wörter über `children`, aber kurz: „läuft“, „Wartung bis 18 Uhr“.
- Nur zeigen, wenn der Status tatsächlich überwacht wird.
- Basiert auf `preview__IconIndicator` aus `@carbon/react` 1.119. Die API kann sich in künftigen Carbon-Versionen noch ändern.
