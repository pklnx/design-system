# TextField

Carbon Text Input (oder mit `multiline` Text Area) mit Label über dem Feld, Hilfetext und Fehlermeldung.

- Feldhöhe `size-lg` (48px), Schrift im Feld 14px. Fläche `field-01` auf `background`, `field-02` auf `layer-01`.
- Label in `label-01`, normale Schreibung. Platzhalter nur als Beispiel, nie als Ersatz für das Label.
- Fehlermeldungen in `text-error` sagen, was zu tun ist: „Bitte die vollständige Adresse angeben, zum Beispiel info@firma.de.“
- Der Konsument liefert eine eindeutige `id` und `label`; `hint`, `error`, `placeholder`, `value`/`onChange` und weitere Props gehen an Carbon.
