# SiteHeader

Seitenkopf als Carbon UI Shell Header: Wortmarke links, Navigation daneben, „Zum Inhalt springen“ für Tastatur.

- Höhe 48px, Fläche `background`, Trennlinie `border-subtle`. Die aktive Seite bekommt `current` und die Carbon-Markierung in `border-interactive` (Purple).
- Höchstens fünf Einträge. Auf schmalen Bildschirmen blendet Carbon die Navigation aus; für Mobile ein Menü über `HeaderMenuButton` ergänzen, wenn nötig.
- Standard ist im Fluss. Mit `fixed` klebt er oben, wie in Carbon üblich; dann braucht der Inhalt 48px Abstand oben.
- Der Konsument liefert `links` (`label`, `href`, `current`) und die `contentId` des Hauptinhalts (Standard `main`).
