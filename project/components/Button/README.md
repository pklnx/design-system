# Button

Carbon Button with pklnx defaults: size `lg` (48px), icon to the right of the label.

- `kind="primary"` (area `button-primary`, Purple): at most once per view, for the action the view is about.
- `kind="secondary"`: the default for every other action.
- `kind="tertiary"`: outlined button for a second important action next to primary.
- `kind="ghost"`: minor actions in tiles, tables and headers.
- `kind="danger"`: destructive actions only, always with a confirmation.
- `icon` takes a name from `Icon` (`arrow-right`, `external`, `copy` …). With `href` a link is rendered.
- Label as a verb, short, sentence case: "Send request", "Copy code". No "Click here", no all caps.
- Avoid disabled buttons. Keep them enabled and say on click what is missing.
- The consumer provides `children` and `onClick` or `href`. Every other prop goes to Carbon `Button` (`size`, `type`, `iconDescription`).
