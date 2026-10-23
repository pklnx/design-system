# CodeBlock

Befehle, Konfiguration und DNS-Einträge zum Kopieren, als Carbon Code Snippet mit Label darüber.

- Eine Zeile wird `single`, mehrere `multi`. Mit `type` lässt sich das erzwingen (`inline` für Code im Fließtext).
- `label` benennt Sprache oder Kontext in normaler Schreibung: „Shell“, „DNS“, „YAML“.
- Text in `code-01`/`code-02` (IBM Plex Mono). Lange Zeilen scrollen im Block, die Seite scrollt nie seitlich.
- Der Kopieren-Button meldet „Kopiert“. Mit `copyable={false}` ausblenden, etwa bei Beispielausgaben.
- Der Konsument liefert `code` als String.
