# Security

Report security problems privately through GitHub's security advisory form for this repository. Do not open a public issue with exploit details.

## Rendering policy

- Dynamic text is inserted as text, not HTML.
- `javascript:`, `vbscript:`, and `data:` values are rejected for dynamic URL attributes and properties, including schemes hidden with ASCII whitespace or control characters.
- `dangerouslySetInnerHTML` and an `unsafeHTML` primitive are not supported.
- DOM nodes passed by application code are trusted application values. Matrix does not sanitize existing nodes.
- CSS passed to `css`, `globalCss`, inline style, or CSS variables is trusted application code. Matrix does not sanitize CSS.

Applications must validate remote URLs and must not build templates or CSS from untrusted strings.
