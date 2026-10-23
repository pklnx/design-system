# pklnx design system

Das Design System von [pklnx.space](https://pklnx.space): **IBM Carbon v11 mit Purple als interaktiver Farbe** und der Wortmarke pklnx★space in IBM Plex Mono.

Dieses Repo ist die Quelle der Wahrheit für zwei Dinge:

1. **Das Carbon-Theme für Code** (`theme/`), einbindbar in jede Carbon-Anwendung.
2. **Das Design System auf claude.ai** (`project/`), die durchsuchbare Referenz mit Tokens, Komponenten-Vorschauen und Assets.

## Theme im Code verwenden

CSS, nach dem Carbon-CSS laden und das Theme auf `<html>` setzen:

```html
<html class="cds--g100">  <!-- oder cds--white -->
```

```js
import '@carbon/styles/css/styles.css';
import '@pklnx/design-system/theme/pklnx-carbon.css';
```

Sass:

```scss
@use '@pklnx/design-system/theme' as pklnx;
@use '@carbon/styles/scss/theme' with ($theme: pklnx.$g100);

.cds--g100 { @include pklnx.overrides-dark; }   // auch Komponenten-Token (Button)
.cds--white { @include pklnx.overrides-light; }
```

Den Stern des Logos gibt es als `--pklnx-star`.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `theme/brand.json` | Die Markenentscheidungen: Primärfarbe (`purple`) und Logofarben. **Hier ändern.** |
| `theme/pklnx-carbon.css`, `theme/_index.scss` | Erzeugt: nur die Token, die von Carbon abweichen |
| `theme/tokens.json` | Erzeugt: alle Carbon-Farbtoken für White und G100 nach der Anpassung |
| `theme/contrast-report.json` | Erzeugt: Kontrastprüfung der wichtigen Paare |
| `theme/logo-geometry.json` | Erzeugt: Pfade der Wortmarke und Bildmarke |
| `src/` | Quellen: Carbon-Komponentenauswahl (`carbon.scss`), eigene Styles (`pklnx.css`), React-Komponenten (`components.jsx`) |
| `scripts/` | Build-Skripte |
| `project/` | Inhalt des claude.ai Design Systems (README, Tokens, Komponenten, Vorschauen, Assets, Fonts) |

## Bauen

```sh
npm install
pip install fonttools brotli
python3 scripts/build_logo.py      # Logos aus IBM Plex Mono
npm run build                      # Tokens, Theme, bundle.css, bundle.js
python3 scripts/build_assets.py    # Muster, Social-Bilder (nach dem Build, liest theme/tokens.json)
node scripts/build_icons.mjs       # Carbon-Icons als SVG
node scripts/render-previews.mjs   # alle Vorschauen in beiden Themes nach .render/ (Chromium)
```

## Veröffentlichen auf claude.ai

Das Design System liegt unter claude.ai als Artifact „pklnx design system“. Veröffentlicht wird von Claude aus diesem Repo:

- Dateien unter `project/` gehen als Dateien hoch, SVGs unter `project/assets/` als Asset-Uploads. Deren IDs stehen in `project/design-system.json` (`assetGroups`).
- Ändert sich ein SVG, muss es neu hochgeladen und die ID im Index ersetzt werden.
- Änderungen direkt im Editor auf claude.ai landen nicht automatisch hier. Vor dem nächsten Build zurückholen und committen.

Lizenzen: Carbon (IBM, Apache-2.0), IBM Plex (SIL Open Font License 1.1).
