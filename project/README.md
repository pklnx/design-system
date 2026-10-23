pklnx.space ist das Einzelunternehmen von Patrick Klein für Infrastructure & Cloud Engineering. Dieses System ist **IBM Carbon (v11), unverändert in Aufbau, Typografie und Komponenten, mit genau einer Markenentscheidung: Purple statt Blue als interaktive Farbe**. Dazu kommt die Marke selbst: die Wortmarke pklnx★space in der Leertaste, gesetzt in IBM Plex Mono.

Wo diese Seite nichts sagt, gilt Carbon: carbondesignsystem.com. Carbon hat Vorrang vor eigenen Ideen.

## Marke

- Die Wortmarke ist **pklnx★space in der Leertaste**: `pklnx` in IBM Plex Mono Bold, der Stern als Punkt, `space` in IBM Plex Mono Regular, darunter die Klammer der Leertaste. Elf Zeichen auf dem Monospace-Raster.
- Die Bildmarke ist **die Leertaste mit Stern**. Sie steht allein, wo für die Wortmarke kein Platz ist: Favicon, Avatar, App-Icon, Vorderseite der Visitenkarte.
- Den Namen immer klein schreiben: `pklnx.space`, im Fließtext auch kurz `pklnx`. Nie „PKLNX“ oder „Pklnx“.
- Der Name ist eine Kunstmarke und bleibt auch nach dem Namenswechsel von Patrick gleich. Personennamen stehen nur in Absenderzeilen, Signaturen und auf der Visitenkarte und werden dort ausgetauscht.
- Im Web die Komponente `Logo` verwenden, für Dateien die SVGs der Gruppe **Logos**. Regeln für Schutzraum, Mindestgrößen und Verbote: Karte `LogoUsage`.

## Farbe

- Zwei Carbon-Themes: **G100 (Dunkel)** ist der Standard für Web, Social und Bildschirm. **White (Papier)** ist für Druck, Rechnung, Brief und helle Seiten. Im Code heißen sie `cds--g100` und `cds--white`.
- Alle Farb-Token sind Carbon-Token mit Carbons Namen und Werten. Geändert sind nur die Token, die in Carbon Blue 60 tragen: `button-primary`, `button-tertiary`, `interactive`, `focus` (hell), `border-interactive`, `link-primary`, `link-secondary`, `icon-interactive`, `highlight`, `background-brand` und ihre Hover- und Active-Stufen. Sie tragen jetzt dieselbe Stufe aus Purple: Buttons Purple 60 `#8a3ffc` in beiden Themes, Links und interaktive Elemente hell Purple 60, im Dunkeln Purple 40 bis 50.
- Besuchte Links (`link-visited`) werden Blue, weil Purple schon die Linkfarbe ist.
- **`button-primary` höchstens einmal pro Ansicht.** Purple ist die Farbe für Bedienung und Links, nicht für Dekoration. Eine große Purple-Fläche (`background-brand`) höchstens einmal pro Seite.
- `star` ist der Stern im Logo und das `$` im Prompt: Purple 60 hell, Purple 50 dunkel. Nie als Bedienfläche.
- Flächen: `background` für die Seite, `layer-01` für Kacheln, `layer-02` für Elemente darauf. Text `text-primary`, Nebentext `text-secondary`, Hilfetext `text-helper`.
- Status bleibt Carbon: `support-success` grün, `support-warning` gelb, `support-error` rot, `support-info` blau. Immer mit Icon und Wort (Komponente `StatusBadge`). `support-caution-undefined` ist in Carbon Purple und kollidiert mit der Marke: nicht verwenden.
- Alle Text-Token halten 4.5:1 auf ihren Gründen in beiden Themes, Fokus, Rahmen und Icons 3:1. Ausnahmen sind Carbons eigene: `text-disabled` absichtlich, `support-warning` (Gelb) auf Weiß nur als Fläche oder Icon mit dunkler Kontur.

## Typografie

- Nur **IBM Plex**: `font-sans` (IBM Plex Sans) für alles, `font-mono` (IBM Plex Mono) für Code, Hostnamen, Befehle, Zahlen in Tabellen und die Marke. Die Schriftdateien liegen unter `fonts/`, im Web aus `@ibm/plex-sans` und `@ibm/plex-mono`.
- Carbons produktive Typo-Skala unverändert: Seitentitel `heading-05`, Abschnitte `heading-04`, Kacheln `heading-03`, Fließtext `body-02` im Web und `body-01` in dichten Bereichen, UI-Texte `body-compact-01`, Labels `label-01`, Hilfetexte `helper-text-01`, Kleingedrucktes `legal-01`, Code `code-01` und `code-02`.
- Einziger eigener Stil: `prompt` (Plex Mono SemiBold 28px) für Abschnittsüberschriften als Shell-Prompt (`$ ls ./services`), sparsam.
- Satzanfang groß, sonst normale Schreibung. Keine Versalien in Labels, Buttons oder Tabellenköpfen.
- Fließtext höchstens 68 Zeichen breit, linksbündig, kein Blocksatz. Zahlen untereinander mit `font-variant-numeric: tabular-nums`. Im Druck Fließtext 10 pt, Kleingedrucktes nicht unter 7 pt.

## Abstände, Form, Raster

- Carbons Abstände `spacing-01` (2px) bis `spacing-13` (160px). Kacheln innen `spacing-05`, zwischen Kacheln 2px Fuge oder `spacing-07`, Abschnitte `spacing-10` mobil und `spacing-11` am Desktop.
- Carbon 2x Grid: 16 Spalten ab 1056px, 8 bis 640px, 4 darunter. Seitenrand `spacing-05`.
- Bedienhöhen aus `size-*`. Im Web Buttons und Felder `size-lg` (48px), das ist auch das Mindestmaß für Touch.
- **Eckig.** `radius-none` für alles. `radius-icon` nur für Favicon- und App-Icon-Kachel, `radius-full` nur für Avatar und Status-Punkt.
- Keine Schatten, außer Carbons eigenem `shadow` für schwebende Menüs. Tiefe entsteht über `layer`-Stufen und 1px-Linien in `border-subtle`.
- Fokus wie Carbon: 2px `focus` innen, im Dunkeln Weiß, hell Purple.

## Sprache und Ton

- Direkt, sachlich, kurz. Ich-Form auf der Webseite („Ich betreibe …“), gegenüber Kunden „Sie“.
- Buttons nennen die Handlung als Verb: „Anfrage senden“, „Code kopieren“. Fehler sagen, was zu tun ist: „Bitte die vollständige Adresse angeben, zum Beispiel info@firma.de.“
- Shell als Stilmittel sparsam: Abschnittsüberschriften als `Prompt` (`$ ls ./services`, `$ cat ./kontakt`), sonst normale Sprache.
- Technische Namen exakt: Hostnamen, Befehle und Pfade in Mono, so wie sie wirklich heißen.
- Keine Emoji, keine Ausrufezeichen, keine Marketing-Superlative.

## Ikonografie

- **Carbon Icons** (`@carbon/icons-react`), über die Komponente `Icon` mit kurzen Namen. 16px neben Text (`icon-size-01`), 20px allein (`icon-size-02`), Farbe `currentColor`.
- Einziges eigenes Zeichen ist der Stern, gefüllt in `star`, nur als Hervorhebung.
- Fehlende Icons aus der Carbon-Bibliothek ergänzen. Keine fremden Icon-Sets, keine Emoji.

## Muster

- Kachelmuster aus Leertasten und Sternen in der Gruppe **Patterns**, 96px-Kachel, Linien `border-subtle-00`.
- Nur hinter wenig Inhalt: Banner, Visitenkarten-Vorderseite, Leerzustände. Nie hinter Fließtext.

## Komponenten

- Web: `SiteHeader` (Carbon UI Shell Header), `Button`, `TextField` (Text Input, Text Area), `CodeBlock` (Code Snippet), `ServiceCard` (Tile), `StatusBadge` (Icon Indicator), `Icon`, dazu die Markenteile `Logo` und `Prompt`. React 18, global `window.Pklnx`, Styles in `components/bundle.css`. Weitere Carbon-Komponenten direkt aus `@carbon/react` verwenden; sie übernehmen das Theme automatisch.
- Geschäftsausstattung im Theme White: `Letterhead` (DIN 5008), `Invoice`, `BusinessCard`, `EmailSignature`. Platzhalter stehen in eckigen Klammern.
- Social: `SocialKit` mit Open-Graph-Bild, Avatar und Banner.

## Im Code

- Quelle: github.com/pklnx/design-system. `theme/pklnx-carbon.css` nach dem Carbon-CSS laden und `cds--g100` oder `cds--white` auf `<html>` setzen. Für Sass gibt es `theme/_index.scss` mit `$g100`, `$white` und den Override-Mixins.
- Werte nie von Hand in Komponenten schreiben, immer Carbon-Token (`var(--cds-…)`) verwenden.
