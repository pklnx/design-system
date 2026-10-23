# CodeBlock

Commands, configuration and DNS records to copy, as a Carbon Code Snippet with a label above.

- One line becomes `single`, several become `multi`. `type` forces it (`inline` for code in running text).
- `label` names the language or context in sentence case: "Shell", "DNS", "YAML".
- Text in `code-01`/`code-02` (IBM Plex Mono). Long lines scroll inside the block, the page never scrolls sideways.
- The copy button reports "Copied". Hide it with `copyable={false}`, for example for sample output.
- The consumer provides `code` as a string.
