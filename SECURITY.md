# Security Policy

Report security problems privately through GitHub's [security advisory form](https://github.com/MickyBalladelli/Matrix/security/advisories/new) for this repository. Do not open a public issue with exploit details.

## Security considerations

Matrix has safe defaults at its rendering boundary, but it is not a sanitizer, a policy engine, or a plugin sandbox.

### Rendering and XSS

- Dynamic text and ordinary dynamic attributes are written as text or attribute values; they are not parsed as template source.
- Dynamic `javascript:`, `vbscript:`, and `data:` URL values are rejected for URL attributes and properties, including schemes hidden with ASCII whitespace or control characters.
- `dangerouslySetInnerHTML` and an `unsafeHTML` primitive are not supported.
- DOM nodes passed by application code are trusted application values. Matrix does not sanitize existing nodes.
- Template strings and CSS definitions must be authored code. Never construct them from user input.

### CSS and isolation

`css()` scopes selectors to a `data-matrix-scope` marker. CSS passed to `css`, `globalCss`, inline style, or CSS variables remains trusted application code and is not sanitized. Validate user-controlled values and use allowlisted classes or CSS tokens.

### Router and forms

`router.navigate()` accepts same-origin URLs and rejects malformed encoded route parameters. Route parameters, query strings, hashes, and form values are still untrusted application data. Validate them before using them in HTML, CSS, filesystem-like paths, or API requests.

Form binding writes to input properties and does not reflect passwords into text or the `value` attribute. Forms and signals still contain application data in memory; do not expose them through logs, devtools, or client-side source shipped to users. Matrix's devtools and performance timeline redact values by default.

### Plugins and deployment

Plugins execute as trusted same-realm JavaScript. The plugin API limits registration to documented extension points, but it does not provide a security sandbox. Only install code from trusted sources.

Anything shipped to the browser is public. Keep secrets on a server boundary, use HTTPS, keep dependencies current, and deploy a restrictive Content Security Policy as defense in depth. CSP does not replace escaping, validation, or server authorization.

Run the local security regression suite with:

```sh
npm run test:browser:security
```
