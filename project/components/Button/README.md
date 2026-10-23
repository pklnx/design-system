# Button

Carbon Button mit pklnx-Defaults: Größe `lg` (48px), Icon rechts vom Text.

- `kind="primary"` (Fläche `button-primary`, Purple): höchstens einmal pro Ansicht, für die Handlung, um die es geht.
- `kind="secondary"`: Standard für alle weiteren Aktionen.
- `kind="tertiary"`: Rahmen-Button für eine zweite wichtige Aktion neben Primary.
- `kind="ghost"`: Nebenaktionen in Kacheln, Tabellen und Kopfzeilen.
- `kind="danger"`: nur für zerstörerische Aktionen, immer mit Bestätigung.
- `icon` nimmt einen Namen aus `Icon` (`arrow-right`, `external`, `copy` …). Mit `href` wird ein Link gerendert.
- Beschriftung als Verb, kurz, Satzanfang groß: „Anfrage senden“, „Code kopieren“. Kein „Klicken Sie hier“, keine Versalien.
- Deaktivierte Buttons vermeiden. Lieber aktiv lassen und beim Klick sagen, was fehlt.
- Der Konsument liefert `children` und `onClick` oder `href`. Alle weiteren Props gehen an Carbon `Button` (`size`, `type`, `iconDescription`).
